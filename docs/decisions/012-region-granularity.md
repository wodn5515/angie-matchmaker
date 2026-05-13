# 012-region-granularity: 거주/출신 지역 2단계 세분화 (광역시→구, 도→시) + V2.x profileCompletion 동기화

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: feature/region-granularity

## 배경

현재 거주지역/출신지역은 광역시·도 17개 (서울/부산/…/제주) 단위로만 입력 가능하다
(`lib/types/v2-options.ts:REGION_OPTIONS`). 매칭 정확도를 위해 한 단계 더 내려가
**광역시(서울/부산/인천/대구/대전/광주/울산)는 구 단위, 도(경기/강원/충북/충남/전북/
전남/경북/경남/제주)는 시 단위** 까지 입력 가능하게 한다. 세종은 특별자치시라
세분화 없음.

이전 대화에서 사용자가 명시한 결정:
- **데이터 모델**: 컬럼 분리 (region + region_detail)
- **세분화 범위**: 광역시 → 구, 도 → 시 단위

함께 처리할 후속 (인접 영역 묶음): PR #22 리뷰의 🟢 nit — `app/me/page.tsx:31-47` 의
`profileCompletion` 계산이 V2.x 4 필드(흡연·음주·결혼관·문신) 미동기화. pending+step=null
가입자가 `/me` 진입 가능해진 11 작업의 사용자 가시 변화와 인접하므로 같은 PR 에서 닫는다.

## 결정

### D1. 데이터 모델 — region/region_detail 두 컬럼 분리

**본인 (friends 테이블)**:
- `region text NULL` — 광역시·도 코드 (기존 유지, 예: "seoul")
- `region_detail text NULL` — 구·시 코드 (신설, 예: "gangnam-gu"). region 이 NULL 이면
  region_detail 도 NULL (CHECK constraint).
- `hometown text NULL` — 동일 패턴 (기존 유지)
- `hometown_detail text NULL` — 신설

본인 row 는 한 사람당 한 거주지·한 출신지만 가지므로 NULL 허용이 자연.

**이상형 (friend_ideal_regions / friend_ideal_hometowns 테이블)**:
- 한 친구가 여러 region/detail 선호 가능 + "광역 전체" 와 "특정 detail" 이 같이 들어갈
  수 있어야 함 — 예: (seoul, '') = "서울 전체", (seoul, 'gangnam-gu') = "강남구만"
- PK 변경: `(friend_id, region, region_detail)` 로 확장
- `region_detail text NOT NULL DEFAULT ''` — PK 정합성을 위해 빈문자열 = "광역 전체"
  의미로 표준화 (NULL 은 PK 에 못 들어감)

같은 패턴: `friend_ideal_hometowns.hometown_detail text NOT NULL DEFAULT ''`

**규칙 요약**:
- 본인 컬럼: NULL 허용
- 이상형 컬럼: 빈문자열 표준 (NOT NULL DEFAULT '')

이 비대칭은 *"한 명의 본인은 detail 모를 수 있음"* vs *"이상형 multi-row 의 PK 는
NULL 불허"* 의 자연스러운 결과.

### D2. 마이그레이션 0006 — 컬럼 추가 + PK 재구성 + RPC 시그니처 변경

`supabase/migrations/0006_region_detail.sql`:

```sql
-- 1. friends 본인 컬럼
alter table friends add column if not exists region_detail text;
alter table friends add column if not exists hometown_detail text;

alter table friends drop constraint if exists friends_region_detail_requires_region;
alter table friends add constraint friends_region_detail_requires_region
  check (region_detail is null or region is not null);

alter table friends drop constraint if exists friends_hometown_detail_requires_hometown;
alter table friends add constraint friends_hometown_detail_requires_hometown
  check (hometown_detail is null or hometown is not null);

-- 2. friend_ideal_regions / friend_ideal_hometowns: detail 컬럼 + PK 재구성
alter table friend_ideal_regions add column if not exists region_detail text not null default '';
alter table friend_ideal_regions drop constraint friend_ideal_regions_pkey;
alter table friend_ideal_regions add primary key (friend_id, region, region_detail);

alter table friend_ideal_hometowns add column if not exists hometown_detail text not null default '';
alter table friend_ideal_hometowns drop constraint friend_ideal_hometowns_pkey;
alter table friend_ideal_hometowns add primary key (friend_id, hometown, hometown_detail);

-- 3. upsert_friend_ideal_aggregate RPC 시그니처 갱신
--    p_regions text[] / p_hometowns text[] → "region|detail" 결합 문자열 배열로 변경.
--    plpgsql 안에서 split_part 로 분해해 INSERT. 시그니처 변경 (signature drop + create).
```

**RPC 변경 방식**: `p_regions text[]` 가 `["seoul", "busan"]` 이던 것을
`["seoul|", "busan|haeundae-gu"]` 형태 — "region|detail" 결합 문자열 배열로 받는다.
plpgsql 안에서 `split_part(x, '|', 1)` / `split_part(x, '|', 2)` 로 분해.

대안 (jsonb / 두 배열 / composite type) 보다 결합 문자열이 최소 침습:
- text[] 시그니처 유지 (Supabase JS array param 자연)
- 클라이언트는 단순 string concat
- 마이그레이션은 함수 drop + create + revoke 한 번이면 끝
- 코드량 최소

`function upsert_friend_ideal_aggregate(...)` 시그니처 자체는 그대로 (`p_regions text[]`)
유지 — plpgsql 내부 INSERT 만 split 로직 추가.

### D3. 옵션 사전 — REGION_DETAIL_OPTIONS 2단계 계층 (lib/types/v2-options.ts)

```ts
/** 광역시·도 17개 — 기존 유지 (단, label 표현은 그대로) */
export const REGION_OPTIONS = [...]; // unchanged

/**
 * 광역시 → 구 단위 / 도 → 시 단위 세부 옵션 사전.
 * key 는 REGION_OPTIONS 의 value (RegionCode).
 * 세종은 특별자치시라 세분화 없음 (key 부재).
 */
export const REGION_DETAIL_OPTIONS: Record<RegionCode, ReadonlyArray<{value:string,label:string}>> = {
  seoul: [
    { value: "jongno-gu", label: "종로구" },
    { value: "jung-gu", label: "중구" },
    // ... 25개
  ],
  busan: [
    // 해운대구·수영구·... 16개
  ],
  // ... 광역시 7개 + 도 9개 (제주 포함)
  sejong: [], // 세종은 빈 배열 — UI 가 "세분화 없음" 으로 처리
};

/** 광역 region 코드 + detail 코드 → "서울 강남구" 같은 결합 한글 라벨. */
export function getRegionFullLabel(region: string | null | undefined, detail: string | null | undefined): string {
  if (!region) return "";
  const regionLabel = REGION_LABEL[region] ?? region;
  if (!detail) return regionLabel;
  // detail 매핑은 REGION_DETAIL_OPTIONS 에서 lookup
  const detailEntry = REGION_DETAIL_OPTIONS[region as RegionCode]?.find((d) => d.value === detail);
  return detailEntry ? `${regionLabel} ${detailEntry.label}` : regionLabel;
}
```

**세분화 단위 표준**:
- 광역시 7개 (서울/부산/인천/대구/대전/광주/울산) → `자치구` 단위 (서울 25개 / 부산 16개 등)
- 도 9개 (경기/강원/충북/충남/전북/전남/경북/경남/제주) → `시·군` 단위 (경기 31개 등)
  - 제주특별자치도는 `시` 단위 (제주시·서귀포시) — 도가 아니지만 광역 단위 + 시 단위로 처리
- 세종특별자치시 → 세분화 없음 (`REGION_DETAIL_OPTIONS.sejong = []`)

실제 항목 작성 (250+ 행) 은 worker 가 한국 행정구역 (행정안전부 공식 시군구 목록 기준)
을 참고해 채운다. 결정 로그에는 단위 표준만 명시.

값 (value) 컨벤션: 영어 슬러그 + 단위 접미사 (`gangnam-gu`, `suwon-si`, `gangneung-si`,
`pocheon-si`, etc.). 일관성을 위해 worker 가 한 번에 결정.

### D4. 매칭 로직 — compareIdealRegions 신설

기존 `compareIdealValues({kind:"multi"})` 는 region 단일값 multi-select 만 처리.
2단계 (region, detail) 비교는 별도 함수 `compareIdealRegions` 가 처리:

```ts
type RegionPref = { region: string; detail: string }; // detail '' 가능
type SelfRegion = { region: string | null; detail: string | null };

export function compareIdealRegions(args: {
  ideal: RegionPref[];
  self: SelfRegion;
}): IdealMatchKind;
```

**매칭 규칙**:
- ideal 빈 배열 또는 self.region null → `neutral`
- ideal 의 어떤 행이 `(region == self.region && detail == '')` → `same` (광역 전체 선호 + 본인 거주지가 그 광역)
- ideal 의 어떤 행이 `(region == self.region && detail == self.detail && self.detail != null)` → `same`
- ideal 행 중 region 만 일치 + detail 미일치 (self.detail 이 있는데 ideal 의 detail 이 다름) → `partial`
- 모든 ideal 행과 region 불일치 → `different`

본인이 region 만 알고 detail 모를 때 (self.detail = null) + ideal 이 특정 detail 만
선호 → `partial` (region 은 맞으니 가능성 있음). 보수적 판정.

**hometown 도 동일 패턴**: `compareIdealHometowns`. 두 함수 모두 같은 시그니처
(이름만 다름) 라 내부 헬퍼 `_compareRegionPrefs` 로 공유.

### D5. 폼 UX

**본인 프로필 폼 (profile-form.tsx / friend-form.tsx)**:
- Region select 1개 (광역 17개)
- Region 선택 시 그 region 의 `REGION_DETAIL_OPTIONS[region]` 가 비어있지 않으면
  Region Detail select 2개째 등장 (cascade)
- Region Detail 은 "선택 안 함" 옵션 포함 — 본인이 detail 모르면 비울 수 있음
- Hometown 도 같은 패턴

**이상형 선호 폼 (preferences-form.tsx)**:
- 각 광역 행마다 expandable disclosure
- 광역 헤더 클릭 → expand → 그 region 의 detail 체크박스 다중 표시
- 광역 헤더에 "전체" 체크 — 체크하면 그 region 의 detail '' 가 저장 (서울 전체)
- 또는 detail 개별 체크 — 다중 선택 (강남구 + 서초구)
- "전체" 와 개별 detail 동시 체크는 허용 (의미: 서울 전체를 좋아하지만 특히 강남/서초)
- 또는 정책: "전체" 체크 시 detail 자동 해제 — 데이터 단순화 (`(region, '')` 한 행만)

**디자이너 호출**: 이상형 폼의 expandable disclosure + 광역 "전체" 토글 UX 는 신규
패턴이라 디자이너에게 골격 제안받는다. 본인 프로필 cascade 는 단순 select 2개라 디자이너 X.

### D6. 디스플레이 — getRegionFullLabel 일관 사용

운영자 측 디스플레이 (`components/operator/friend-ideal-section.tsx`,
`components/operator/friend-form.tsx`, 비교 뷰 등) 에서:
- "서울" → "서울" (detail 없으면 광역만)
- "서울 강남구" → "서울 강남구" (detail 있으면 결합)

`getRegionFullLabel(region, detail)` / `getHometownFullLabel(hometown, hometown_detail)`
가 single source. 기존 `getRegionLabel` / `getHometownLabel` 도 유지 (광역만 표시
필요한 곳을 위해).

### D7. 마이그레이션 백필 — 기존 데이터 보존

- `friends.region` 가 채워진 기존 row 는 `region_detail = NULL` 로 자연 유지 (단순
  `add column` 의 default 가 NULL)
- `friend_ideal_regions` 의 기존 (friend_id, region) 행은 `region_detail = ''` (DEFAULT)
  로 채워지며 PK 재구성 후에도 한 행에 한 (region, '') 로 보존
- 데이터 손실 없음. UX 회귀 없음 — 광역만 입력된 가입자는 그대로 광역만 표시.

### D8. profileCompletion fix (인접 nit)

`app/me/page.tsx:31-47` 의 지역 `profileCompletion` 계산을 V2.x 4 필드 + 본 작업의
region_detail 까지 동기화:
- 옵션 A: `lib/db/friends.ts` 의 권장 11 필드 + base 6 + tier1 동일 형태로 갱신.
  region_detail 은 권장 필드에 추가하지 않음 (광역만 입력해도 "거주지 채움" 으로 인정).
- 사용자가 PR #22 리뷰에서 추천한 방향. 채택.

선택지:
- 권장 7 → 11 (+ smoking + drinking + marriage_view + tattoo)
- max 13 → 17 (base 6 + 권장 11)

또는 사용자 제안 옵션 B (lib/db/friends.ts profileCompletion() 재사용) — worker 가
이 함수가 어떻게 구현돼 있는지 확인 후 자연스러운 형태로 선택. 결정 로그는 "권장
필드에 V2.x 4 필드 추가" 만 명시.

### D9. README + CLAUDE.md 동기화

- README.md 의 데이터 모델 표에 region_detail / hometown_detail 추가
- CLAUDE.md §6 의 friends / friend_ideal_regions / friend_ideal_hometowns 항목에 detail 컬럼 명시
- 마이그레이션 목록에 `0006_region_detail.sql` 추가

## 근거

- 컬럼 분리(D1)는 사용자가 명시. 결합 저장(예: "서울 강남구" 한 컬럼)이 단순하지만
  매칭·필터·집계에서 불리.
- 본인 NULL / 이상형 빈문자열 비대칭(D1)은 의도된 차이 — multi-row PK 의 NULL 제약을
  우회하면서 본인 폼의 자연 표현(detail 모를 수 있음)을 보존.
- RPC 결합 문자열(D2)은 jsonb 보다 코드량 절반 미만 + 시그니처 변경 최소.
- compareIdealRegions 신설(D4)은 단일 enum 비교와 의미가 달라 (region 일치 + detail
  부분 일치) compareIdealValues 의 단순 확장으론 표현 어려움. 별 함수가 가독성 좋음.
- 디자이너 호출(D5)은 광역 expandable + "전체" 토글이 기존 MultiSelectChip 만으론
  부족한 신규 UX 패턴이라 골격 합의 필요. 본인 프로필은 cascade select 이라 불필요.
- nit 함께 처리(D8)는 사용자가 "한 PR 에 묶어서" 명시.

## 거절된 대안

- **컬럼 통합** ("서울 강남구" 한 컬럼) — 매칭·집계 불리, 결정과 어긋남.
- **본인도 빈문자열 표준** — 자기 detail 모를 때 빈문자열로 강제 저장하면 "정보 미입력"
  과 "광역 전체 인지" 구분 불가.
- **NULL 이상형 detail** — `(friend_id, region, NULL)` 이 PK 일관 어려움 (NULL distinct
  처리 RDBMS 별 차이). 빈문자열 표준이 단순.
- **RPC text[][] (2차원 배열)** — Supabase JS array param 직렬화 미보장. 결합 문자열
  text[] 가 더 안전.
- **compareIdealValues 확장 (kind:"region_multi" 추가)** — 단일 함수가 너무 많은 분기를
  품게 됨. 별 함수 (compareIdealRegions) 가 가독성 우위.
- **expandable 없이 평면 multi-select** — 항목 250+ 가 한 화면에 노출되면 모바일 360px
  에서 무리. 디자이너에 골격 의뢰 후 결정.

## 후속 영향

- `lib/db/ideals.ts` 의 `loadFriendIdeals` / `upsertFriendIdealAggregate` 시그니처 변경
- `lib/db/friends.ts` 의 read/select 에 region_detail/hometown_detail 추가
- `lib/validation/profile.ts` 의 ProfileSchema / Preferences FormData 파싱 갱신
- `app/onboarding/profile/profile-form.tsx`, `app/onboarding/preferences/preferences-form.tsx`,
  `components/operator/friend-form.tsx` 폼 갱신
- `components/operator/friend-ideal-section.tsx`, `components/operator/ideal-match-row.tsx`,
  비교 뷰 등 디스플레이 표면 갱신
- 신규 함수 `compareIdealRegions` 도입 — 매칭 비교 함수 호출처 일부 변경
- README.md / CLAUDE.md §6 / §4 사실 영역 동기화
- 다음 작업에서 region_detail 도 profileCompletion 권장 필드에 포함시킬지 검토 가능
  (본 PR 에서는 광역만 입력해도 채움으로 인정)

## TDD 게이트 (worker 통과 목표)

- 단위: `lib/types/v2-options` — REGION_DETAIL_OPTIONS 존재 + 광역시 7개에 detail
  배열 비공백 + 세종은 빈 배열 + getRegionFullLabel 결합 라벨
- 단위: `compareIdealRegions` 4종 (same/partial/different/neutral) 매트릭스
- 단위: ProfileSchema region_detail conditional (region 없으면 detail 도 빈/null)
- 통합: upsertFriendIdealAggregate → loadFriendIdeals 라운드트립 (region+detail 보존)
- 컴포넌트: 본인 프로필 폼 cascade — region 선택 시 detail select 표시
- 컴포넌트: 이상형 폼 — 광역 expand + detail multi-select + "전체" 토글
- 단위: profileCompletion V2.x 4 필드 동기화 (권장 11 + max 17 또는 등가)

## 디자이너 게이트 결과 (2026-05-13)

이상형 폼 골격 채택 — Accordion 패턴 (`<details>` native disclosure).

**확정 정책**:
- **상호 배타 (단일 행 우선)** — D5 의 "동시 체크 vs 자동 해제" 중 자동 해제 채택:
  - "전체" 체크 시 그 region 의 detail 들 자동 해제 → 저장: `(seoul, '')` 한 행
  - detail 체크 시 "전체" 자동 해제 → 저장: `(seoul, 'gangnam-gu')` 등 N 행
  - detail 모두 해제 = 그 region 미선택 (행 0개). "전체" 와 의미 분리.
  - 근거: 매칭 함수 분기 단순 + 사용자 멘탈 모델 단순 + V1 점수 X 정책에서 가중치
    의미 손실 거의 없음.

- **신설 프리미티브**: `components/ui/region-detail-picker.tsx` (UI 일반 프리미티브.
  preferences-form + 필요시 운영자 friend-form 도 재사용)

- **직렬화 형식**: hidden input `name="regions" value="region|detail"` 1 행 1 input.
  서버 `formData.getAll("regions")` → `split("|")` → RPC `p_regions text[]` 와 그대로
  일치 (D2 RPC 시그니처 정합).

- **타입**: `RegionDetailValue = { region: string; detail: string }`. `string[]` 흐름
  전체를 `RegionDetailValue[]` 로 마이그레이션 (loadFriendIdeals 리턴 / 폼 defaults /
  validation 까지).

- **헤더 상태 표시**:
  - `none` (미선택): 라벨만
  - `all` ("전체"): 핑크 "전체" 배지 + 핑크 8% 행 배경 틴트
  - `partial` (detail N개): 회색 "N개" 배지 + 핑크 8% 행 배경 틴트

- **세종 (detail 없음)**: chevron 숨김 + 본문 없이 "선택" 토글만. worker 가 마이크로
  조정 가능.

- **상단 요약 칩**: 선택된 (region, detail) 들을 핑크 칩으로 표시 + × 로 빠른 제거.
  `value.length === 0` 이면 emptyHint ("선택 안 함 = 상관없음") 표시.

**worker 함정 (디자이너가 명시한 6건)**:
1. `<summary>` 안 "전체" 버튼 클릭 시 details 동시 토글 — `preventDefault()` +
   `stopPropagation()` 둘 다 필수.
2. `PreferencesFormDefaults.regions` 타입 변경 — string[] → RegionDetailValue[]
3. hidden input "region|detail" 결합 직렬화 — server action FormData 파싱부터 통일
4. 세종 행 chevron 처리
5. 운영자 측 friend-form 재사용 검토 (운영자 톤이지만 핑크는 기능 표시라 자연)
6. 본인 프로필 cascade 는 단순 Select 2개 (이 컴포넌트 무관)

본인 프로필 폼 cascade (region select + region_detail select) 는 단순 select 2개로
구현 — 디자이너 설계 대상 외.

## TDD 게이트 결과 (2026-05-13)

test-writer 라운드 1 보고 채택. 빨강 spec 7개 파일 + 약 99개 신규 빨강 (분기 누락 의도)
+ 회귀 방어선 18 통과. spec 약화 없음.

작성된 파일:
- `tests/unit/v2-options-region-detail.test.ts` — REGION_DETAIL_OPTIONS / getRegionFullLabel
- `tests/unit/compare-ideal-regions.test.ts` — compareIdealRegions / compareIdealHometowns 매트릭스
- `tests/unit/region-detail-picker.test.tsx` — UI 컴포넌트 (Accordion + 상호 배타 + hidden input 직렬화)
- `tests/unit/profile-schema-region-detail.test.ts` — ProfileSchema + parsePreferencesFormData
- `tests/unit/profile-completion-v2x.test.ts` — D8 nit (me page 인라인 갱신)
- `tests/integration/ideals-region-detail.test.ts` — upsert/load 라운드트립 + 0006 마이그레이션 SQL 정합
- `e2e/tests/region-detail.spec.ts` — fixture 부재로 baseline 빨강 (011 패턴 동일)

Lead 판단 (test-writer 의견 5건 모두 그대로 채택):
1. `profile-completion-v2x.test.ts` 11개 통과 spec 유지 — 회귀 방어선.
2. ProfileSchema 자율 정책 2개 (reject OR normalize) 유지 — worker 가 자연 선택.
3. compareIdealRegions 상호 배타 외 입력에 대한 best match robust 검증 유지.
4. region-detail-picker selector 가 디자이너 골격 라벨 그대로 가정 — worker 가 골격 그대로 구현하면 통과.
5. 슬러그 컨벤션 — 결정 로그에 명시 추가 (아래).

### detail 슬러그 컨벤션 (worker 가 250+ 항목 작성 시 따를 규칙)

- 영어 lowercase + `-` 만 사용. 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- 단위 접미사 포함: 구는 `-gu`, 시는 `-si`, 군은 `-gun`
  - 예: `gangnam-gu` (강남구), `suwon-si` (수원시), `pyeongchang-gun` (평창군)
- 한국어 로마자 표기: 국립국어원 표기법 기준 (예: 부산 `busan`, 경상남도 `gyeongnam`)
- 동음 / 이형 충돌은 광역 그룹 안에서만 고려 — 다른 region 의 같은 슬러그 OK
- 일관성을 위해 worker 가 한 번에 표준화 (한국 행정안전부 시군구 목록 기준)

### worker 통과 목표

- `npm test` 의 신규 빨강 99건 전부 초록 (REGION_DETAIL_OPTIONS / getRegionFullLabel / compareIdealRegions / RegionDetailPicker / RPC payload "region|detail" / 0006 마이그레이션 SQL / me page profileCompletion 인라인)
- baseline (`tests/unit/auth-user.test.ts` 7건) 그대로 유지, 회귀 추가 금지
- E2E 4건은 fixture 부재로 baseline 빨강 — worker 통과 목표 외 (011 패턴)
- `npm run lint` / `npm run build` / `tsc --noEmit` 통과

## worker 라운드 1 호환성 결정 (2026-05-13)

worker 가 진행 중 `tests/integration/ideal-aggregate-rpc.test.ts` (V2.1, PR #11 인프라)
가 `regions: ["seoul", "gyeonggi"]` string[] 형태로 호출 + substring 검증함을 보고.
새 spec 은 객체 배열 + 결합 직렬화 검증.

**채택**: `upsertFriendIdealAggregate` input 을 `(string | RegionDetailValue)[]` **유니온**
으로 받아 정규화:
- string → `"x|"` (광역만 / detail '' 의미)
- 객체 → `"region|detail"`

두 spec 모두 만족 — 기존 spec 의 substring "seoul" 도 직렬화된 "seoul|" 에 자연 포함.
spec 약화/강화 아닌 호환성 보장 (정상 진화).

**근거**: 본 PR 통과 목표가 "신규 빨강 초록 + baseline 회귀 추가 금지". 기존 통과 spec
변경 회귀를 피하면서 새 시그니처 도입.

**후속 영향**: 일시적 유니온 시그니처는 추후 옛 spec 갱신 후 객체 배열로 단일화 가능
— 본 PR 범위 외. PR 본문에 후속 작업으로 명시.
