# 009-v2-self-traits: 본인 프로필에 흡연·음주·결혼관·문신 4 항목 추가 — 이상형 매칭 대칭 회복

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: `feature/v2-self-traits` 브랜치
> 관련 자료: [`docs/decisions/004-v2-self-signup-direction.md`](./004-v2-self-signup-direction.md), [`docs/decisions/008-v2-routing-display-fixes.md`](./008-v2-routing-display-fixes.md), [`docs/PRD.md`](../PRD.md) §3.1.2 / §3.3.3 / §4.2

## 배경

PR #13 머지 후 사용자가 실제 운영 중 다음 갭 발견:

> "이상형에 담배, 술, 문신 뭐 이런거 체크하는데 자기의 그 상황을 적어야 이사람이 이상형인가 아닌가를 구분할 수 있을텐데"

진단:

| 이상형 §1 항목 (`friend_ideals`) | 본인 프로필 (`friends`) | 양방향 매칭 가능 |
|---|---|---|
| age_from / age_to | `birth_year` | ✅ |
| 1:N regions (선호 거주지역) | `region` | ✅ |
| 1:N hometowns (선호 출신지역) | `hometown` | ✅ |
| `smoking` (any/non_smoker_only) | **없음** | ❌ |
| `drinking` (any/often/sometimes/non) | **없음** | ❌ |
| `marriage_timing` (any/within_2y/over_3y/dating) | **없음** | ❌ |
| 1:N jobs (선호 직업군) | `occupation` | ✅ |
| `tattoo` (any/none_only/small_ok) | **없음** | ❌ |

PRD §3.3.3 (이상형) 에 4 항목 있는데 PRD §3.1.2 (본인 프로필 권장 필드) + §4.2 (`friends` 스키마) 에 대응 항목 없음. 운영자가 비교 뷰에서 "A 의 이상형 = 비흡연자만" 단서를 봐도 B 의 흡연 상태가 DB 에 없으니 매칭 비교 불가능 — V2 설계 단계 갭.

## 결정

`friends` 테이블에 4 컬럼 신규 추가하고 가입 폼 / `/me/profile` / 운영자 표시 / 비교 뷰 양방향 매칭 enable.

### D1. `friends` 스키마 확장 (마이그레이션 0005)

```sql
alter table friends add column smoking text
  check (smoking is null or smoking in ('non_smoker','occasional','regular'));
alter table friends add column drinking text
  check (drinking is null or drinking in ('non_drinker','sometimes','often'));
alter table friends add column marriage_view text
  check (marriage_view is null or marriage_view in ('within_2y','over_3y','dating_focus'));
alter table friends add column tattoo text
  check (tattoo is null or tattoo in ('none','small','large'));
```

값 enum 은 이상형 (`friend_ideals.smoking/drinking/marriage_timing/tattoo`) 의 "상관없음 제외" 셋으로 정렬:
- **smoking**: `non_smoker` (비흡연) / `occasional` (가끔 핀다) / `regular` (자주 핀다)
- **drinking**: `non_drinker` (안 마심) / `sometimes` (가끔) / `often` (자주)
- **marriage_view**: `within_2y` (1~2년 내) / `over_3y` (3년 이상) / `dating_focus` (연애 위주)
- **tattoo**: `none` (없음) / `small` (작은 것) / `large` (큰/여러 개)

모두 nullable (선택 입력) — 권장 필드 정책 (§3.1.2) 정합.

### D2. PRD §3.1.2 권장 필드 9 → 13 확장

```
필수 4 (기존): 이름·성별·성취향·추천인
권장 13 (이전 9 + 신규 4):
  - 인스타·출생연도·거주지역·출신지역·직업·연애상태·매칭관심도 (기존)
  - 흡연·음주·결혼관·문신 (신규 — 이상형 매칭 대칭)
```

PRD §4.2 `friends` 스키마 표에 4 컬럼 추가.

### D3. 가입 폼 Step 1 / `/me/profile` 4 항목 추가

`app/onboarding/profile/profile-form.tsx` 와 `app/me/profile/page.tsx` (재사용 폼) 에 4 항목 추가. 선택 입력. "안 적어도 됨, 다만 매칭 정확도 ↑" 안내.

UI: 라디오 또는 select. 이상형 폼과 같은 레이아웃 톤 (`ChoiceGroup` 등 이미 있으면 재사용 / 없으면 디자이너 게이트 — 보통은 이미 있을 것).

### D4. 운영자 디테일 페이지 표시 + 비교 뷰 양방향 매칭 enable

- `app/(operator)/friends/[id]/page.tsx` — 본인 프로필 섹션에 4 항목 표시 (값 없으면 "—")
- `app/(operator)/compare/metadata-comparison.tsx` — 4 row 추가
- `app/(operator)/compare/ideal-match-section.tsx` — 이상형 §1 8 항목 양방향 매칭에서 4 항목 매칭 활성 (현재는 본인 프로필 값이 null 이라 항상 neutral 로 떨어지는데, 4 항목 추가 후 정상 비교)
- 리스트 페이지 (`app/(operator)/friends/page.tsx`) 는 카드 정보 폭주 우려라 표시 안 함 — 자율

### D5. 라벨 helper 4개 신규

```ts
// lib/types/v2-options.ts
export function getSmokingLabel(value: string | null | undefined): string;
export function getDrinkingLabel(value: string | null | undefined): string;
export function getMarriageViewLabel(value: string | null | undefined): string;
export function getTattooLabel(value: string | null | undefined): string;
```

008 의 `makeLabelGetter` 패턴 재사용. 한글 라벨:
- smoking: 비흡연 / 가끔 핀다 / 자주 핀다
- drinking: 안 마심 / 가끔 / 자주
- marriage_view: 1~2년 내 결혼 / 3년 이후 결혼 / 연애 위주
- tattoo: 없음 / 작은 것 / 큰·여러 개

이상형 쪽 라벨 (`SMOKING_LABEL` 등 — `lib/types/v2-options.ts`) 과 분리 (이상형은 "상관없음" 포함). 사전 객체 2벌이 코드 복잡도 약간 ↑ 지만 enum 셋 자체가 다르므로 분리가 명확.

## 근거

### 대칭이 매칭 의미 결정적

PRD §3.4.2 비교 뷰 확장의 핵심이 **이상형 양방향 매칭 ✅⚠️❌·neutral**. 본인 프로필 4 컬럼 부재면 4 항목이 항상 neutral 로 떨어져 매칭 단서 비활성 — 비교 뷰 가치의 1/2 가 죽음.

### 운영자 부담 작음

권장 입력 (선택 가능). 운영자가 매칭에 정보 필요하면 가입자에게 "더 적어 주세요" 안내 가능. 강제 X.

### Helper 패턴 일관성

008 의 `makeLabelGetter` 가 안정화돼 4 항목도 그 패턴 그대로 — 신규 helper 4개 자연 추가.

### 마이그레이션 보존 원칙

0003·0004 직접 수정 X, 0005 신규 추가. decisions/007 §B 정신 그대로.

## 거절된 대안

### A. 이상형 §1 에서 4 항목 제거 (대칭을 반대 방향으로)

- 매칭 정보 손실 + 사용자가 직접 V2 PRD §3.3.3 설계에 합의한 항목이라 제거하면 의도 거역
- 채택 안 함

### B. `friend_self_traits` 별 1:1 테이블

- 정규화 가치 약함 (4 컬럼 1:1) — `friends` 컬럼 추가가 더 자연
- friend_ideals 가 1:1 인 것과 같은 패턴
- 채택 안 함

### C. 본인 프로필 4 항목 = enum 값 셋 = 이상형의 "상관없음 제외" 셋 그대로

- 이상형 enum: `any/non_smoker_only` ← "이상형 측면" 표현 (상관없는지 여부 + 선호하는 값)
- 본인 프로필 enum: `non_smoker/occasional/regular` ← "자기 상태" 표현 (실제 행위)
- 두 enum 셋이 의미상 직접 1:1 매핑 안 됨 (이상형엔 "가끔/자주" 같은 세부 분류 없음)
- 매칭 로직 단순화 위해 본인 프로필 enum 셋이 이상형 셋 보다 세부적이게 (smoking 3단계 vs 이상형 2단계) — 매칭 시 변환 함수
- 채택 (위 D1 의 enum 셋)

### D. V2.2 첫 PR 에 묶기 (helper 패턴 확장 + 검색 hay 한글화 + E2E + self-traits)

- self-traits 가 가장 큰 변경 (마이그레이션 + 데이터 모델 + UX) — 다른 V2.2 백로그 (refactor / E2E setup) 와 성격 매우 다름
- 별 PR 로 가는 게 commit-by-commit 리뷰 + 분리 가치 큼
- 채택 안 함

## 후속 영향

### 코드 변경 범위

| 영역 | 파일 | 변경 |
|---|---|---|
| 마이그레이션 | `supabase/migrations/0005_friends_self_traits.sql` (신규) | friends + 4 컬럼 + CHECK |
| 타입 | `lib/types/domain.ts` | Friend 타입 + 4 필드 |
| 옵션 사전 | `lib/types/v2-options.ts` | SELF_SMOKING_LABEL / SELF_DRINKING_LABEL / MARRIAGE_VIEW_LABEL / SELF_TATTOO_LABEL + 4 helper |
| 가입 폼 | `app/onboarding/profile/profile-form.tsx` | 4 항목 입력 |
| 자기 페이지 | `app/me/profile/page.tsx` | (폼 재사용) |
| 운영자 디테일 | `app/(operator)/friends/[id]/page.tsx` | 본인 프로필 섹션에 4 항목 표시 |
| 비교 뷰 | `app/(operator)/compare/metadata-comparison.tsx` | 4 row 추가 |
| 비교 뷰 | `app/(operator)/compare/ideal-match-section.tsx` | 4 항목 매칭 활성화 (이상형 enum ↔ 본인 enum 매핑 함수) |
| 비교 함수 | `lib/db/ideals.ts` 또는 새 helper | `compareIdealValues` 가 4 항목 대응 (single kind) |

### PRD 갱신

- §3.1.2 권장 필드 9 → 13
- §4.2 `friends` 스키마에 4 컬럼 추가
- §3.4.2 비교 뷰 양방향 매칭 4 항목 활성 명시

### CLAUDE.md 사실 영역 동기화

- §6 데이터 모델 — 0005 마이그레이션 + friends + 4 컬럼 명시
- §11 환경 변수 변화 없음

### README.md

- "기술 스택" / "사이트맵" 변화 없음
- "데이터 모델" 섹션이 있으면 4 컬럼 반영 — worker 가 점검

### TDD 게이트 적용

- 마이그레이션 0005 SQL 텍스트 파싱 spec (기존 migration-0003/0004 패턴)
- 라벨 helper 4개 spec (008 의 options-labels.test.ts 패턴)
- 이상형 ↔ 본인 매칭 비교 함수 spec — 이상형 enum × 본인 enum 매트릭스 (smoking 2×3=6 / drinking 4×3=12 / marriage 4×3=12 / tattoo 3×3=9 → 총 39 케이스. 너무 많으면 worker 자율로 representative 케이스만)
- 폼 검증 spec (선택 입력 빈 채로 통과 등)

### V2.2 백로그 (변동 없음)

- helper 패턴 확장 (PERSONALITY_KEYWORD / PRIORITY_CATEGORY)
- 검색 hay 한글화
- E2E P1 storageState 셋업
- self-traits 와 별 PR 로 분리 진행

## TDD 게이트 spec 채택 (test-writer 라운드 1 결과)

test-writer 단발 호출 (커밋 `4d172e5`) 결과 전량 채택. 3 spec 파일 / 71 케이스 / 빨강 36 / 통과 3 (negative invariant) / 기존 회귀 X (193 passed).

### S1. spec 파일 채택

| 결정 | 파일 | 케이스 |
|---|---|---|
| D1 (마이그레이션) | `tests/integration/migration-0005.test.ts` | 17 (SQL 텍스트 파싱 — 0003/0004 패턴) |
| D5 (라벨 helper) | `tests/unit/self-traits-labels.test.ts` | 22 (4 helper × 정확 매칭 + raw fallback + null) |
| D4 (매칭 매트릭스) | `tests/unit/compare-self-trait.test.ts` | 32 (smoking 6 + drinking 9 + marriage 9 + tattoo 6 + neutral 공통) |

### S2. worker 가 채울 인터페이스

```ts
// lib/types/v2-options.ts (helper 4 추가)
export type SmokingSelf = "non_smoker" | "occasional" | "regular";
export type DrinkingSelf = "non_drinker" | "sometimes" | "often";
export type MarriageViewSelf = "within_2y" | "over_3y" | "dating_focus";
export type TattooSelf = "none" | "small" | "large";

export const SELF_SMOKING_LABEL: Record<SmokingSelf, string>;
export const SELF_DRINKING_LABEL: Record<DrinkingSelf, string>;
export const SELF_MARRIAGE_VIEW_LABEL: Record<MarriageViewSelf, string>;
export const SELF_TATTOO_LABEL: Record<TattooSelf, string>;

export function getSmokingLabel(value: string | null | undefined): string;
export function getDrinkingLabel(value: string | null | undefined): string;
export function getMarriageViewLabel(value: string | null | undefined): string;
export function getTattooLabel(value: string | null | undefined): string;

// lib/db/self-trait-match.ts (신규 — 또는 ideals.ts 확장 + re-export)
export type SelfTraitMatchKind = "same" | "partial" | "different" | "neutral";
export function compareSelfTrait(args: {
  idealValue: string | null;
  profileValue: string | null;
  kind: "smoking" | "drinking" | "marriage_view" | "tattoo";
}): SelfTraitMatchKind;
```

### S3. 매칭 매트릭스 경계 (Lead 채택)

test-writer 자율 결정 채택 — 운영자 의도 해석상 합리적:

- **drinking sometimes_only + non_drinker → partial** (안 마셔도 OK 의도)
- **drinking often_ok + 모든 본인 → same** (다 OK 의 의미)
- **marriage_view 인접 단계 (within_2y↔over_3y, over_3y↔dating_focus) → partial**, **양 끝단 (within_2y↔dating_focus) → different**
- **tattoo small_ok + none → same** (없는 것도 OK 범위)

### S4. 라벨 텍스트 (009 §D5 본문 그대로 — worker 채택 권장)

- smoking: 비흡연 / 가끔 핀다 / 자주 핀다
- drinking: 안 마심 / 가끔 / 자주
- marriage_view: 1~2년 내 결혼 / 3년 이후 결혼 / 연애 위주
- tattoo: 없음 / 작은 것 / 큰·여러 개

worker 가 운영자 디테일 톤 정리하다 미세 수정 원하면 spec 같이 수정 → Lead 보고.

### S5. 약화·범위 메모

- **`compareSelfTrait` 위치**: spec import 는 `@/lib/db/self-trait-match`. worker 가 `ideals.ts` 로 옮기고 싶다면 wrapper re-export 한 줄로 충분
- **폼 검증 spec S4 생략**: 기존 `ProfileSchema` 가 모든 V2 권장 필드를 `.optional()` 패턴이라 신규 4 항목도 같은 패턴 — 별 spec 추가 가치 X
- **운영자 디테일 / 비교 뷰 통합 spec 미작성**: 라벨 helper + 매칭 함수 단위 spec 이 회귀 방어선. 페이지 본체 통합 spec 은 사용자 가시 검증으로 충분

### S6. worker 프롬프트 필수 사항

- 위 인터페이스 그대로 채움
- 매칭 매트릭스 경계 (S3) 그대로 — 변경 필요 시 Lead 보고
- 라벨 텍스트 (S4) 변경 자유, 단 spec 의 정확 매칭 케이스도 같이 갱신 (또는 spec 약화)
- 마이그레이션 0003·0004 미터치 (0005 신규)
- README + CLAUDE.md 사실 영역 (§6 데이터 모델) 동기화 — 0005 명시
