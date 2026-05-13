# 013-pending-deprecation: /pending 라우트 폐기 + /me 통합 + "직접 안내" 카피 정직성 회복

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: feature/pending-deprecation

## 배경

011 (PR #22) 로 pending+step=null 가입자에게 `/me/*` 진입을 열어주면서 `/pending` 페이지의
unique value 가 사실상 사라졌다 — 액션 카드 3개가 `/me` 의 액션 카드 3개와 거의 동일, 상단
"심사 대기 중" 안내는 `/me` 의 pending StatusBanner 분기가 이미 인수.

게다가 양쪽 카피에 공통으로 박힌 "운영자가 직접 안내드릴게요" / "직접 안내해요" 가 **거짓
약속**이다. 사용자 확인: **운영자가 외부 채널(메일·카톡)로 통과/거절 안내 안 함** — 가입자가
사이트 재입장으로 알아채는 흐름. PRD §1 의 V1 non-goal "결과 외부 공유" 와도 정합 (매칭
결과 자체를 가입자에게 표시하는 기능도 V1 범위 외 — 즉 사이트 재입장도 정확한 통보 경로
아님). PR #21 카피 일반화에서 "카톡" → "직접 안내" 까지만 손대고 안내 행위 자체의 존재
여부는 검토 안 한 영역.

이 두 가지를 한 PR 안에서 동시 해소:
1. `/pending` 라우트 폐기 + `/me` 통합 — 가드 default redirect target 변경
2. `/me` 의 안내 카피 (pending / approved / 하단 fixed) 를 안내 약속 없는 정직한 톤으로 정정

## 결정

### D1. 가드 매트릭스 변경 — pending+step=null default = `/me`

`lib/auth/guard.ts` 의 매트릭스:

| status   | onboarding_step | pathname       | Before              | After                            |
|----------|-----------------|----------------|---------------------|----------------------------------|
| pending  | null            | `/pending`     | pass                | **redirect `/me` (NEW)**         |
| pending  | null            | `/me`          | pass                | pass (유지)                      |
| pending  | null            | `/me/*`        | pass                | pass (유지)                      |
| pending  | null            | `/onboarding/*`| redirect `/pending` | **redirect `/me` (NEW)**         |
| pending  | null            | 그 외 보호 path | redirect `/pending` | **redirect `/me` (NEW)**         |
| pending  | step!=null      | `/me/*`        | redirect resume     | redirect resume (유지)           |
| pending  | step!=null      | 기타           | redirect resume     | redirect resume (회귀 유지)       |
| approved | —               | `/pending`     | redirect `/me`      | redirect `/me` (유지)            |
| approved | —               | 그 외          | 동일                | 동일 (회귀)                       |
| rejected | —               | `/pending`     | redirect `/rejected`| redirect `/rejected` (회귀 유지) |
| 비로그인 | —               | `/pending`     | pass (announcement) | **redirect `/login` (NEW)** — 폐기 라우트라 announcement 자격 박탈 |
| 운영자   | —               | `/pending`     | redirect `/`        | redirect `/` (유지)              |

`PENDING_PREFIX` 상수 + `isAnnouncementRoute` 의 pending 분기 제거. `resolveOnboardingResumeTarget` 의
fallback (`?? "/pending"`) 도 `?? "/me"` 로 변경.

### D2. `/pending` 페이지 파일 자체 삭제

`app/pending/page.tsx` 삭제. Next.js App Router 가 라우트 자체를 인식 못 하게 함. URL
진입은 가드 단계의 redirect 가 흡수 (D1).

`pending/` 디렉토리도 비면 삭제. 라우트 그룹의 다른 파일 없는지 확인 후.

### D3. `/me` 카피 정직성 회복

`app/me/page.tsx` 의 안내 텍스트 3 군데 모두 "직접 안내" 약속 제거.

| 위치 | Before | After |
|---|---|---|
| pending StatusBanner description | "미리 채워두면 운영자가 더 빨리 검토해요. 결과가 나오면 직접 안내드릴게요." | "운영자가 검토 중이에요. 미리 채워두면 매칭 풀에 더 빨리 합류할 수 있어요." |
| approved StatusBanner description | "운영자가 잘 어울리는 분을 찾으면 직접 안내드려요." | "운영자가 잘 어울리는 분을 찾고 있어요." |
| 하단 footer 본문 | "매칭은 운영자가 직접 안내해요. 사이트에는 따로 표시되지 않으니 안내를 기다려주세요." | **삭제** (배너만으로 안내 충분, 거짓 약속 제거) |

원칙: "안내드릴게요" 같은 미래 약속 표현 X. 검토·매칭 행위의 **사실**만. 매칭 결과를
가입자가 어떻게 알게 되는지는 V1 미정의 영역 (PRD non-goal "결과 외부 공유") 이라 그
경로를 명시하지 않는다.

### D4. "설문" → "연애 성향 테스트" 워딩 정합

가입자 측에서 부르는 호칭이 카드 라벨에선 "연애 성향 테스트", 페이지 본문·운영자 측 도구
에선 "설문" 으로 혼재 — 같은 대상의 호칭이 일관되지 않다.

사용자 가시 카피 모두 **"연애 성향 테스트"** (또는 줄여 "테스트") 로 통일. 단 코드의
변수·함수·테이블명 (`surveys` / `survey_questions` / `survey_chapters` / `survey_answers` /
`/me/survey` URL / `Survey*` 컴포넌트 / `ensureStandardSurvey` 등) 은 유지 — 도메인
모델명은 일반 표현이 적합하고 데이터 모델·URL 변경 표면이 거대하다 (마이그레이션 + 가드 +
외부 링크 호환 모두 영향).

**카피 변경 대상 (사용자 가시)**:

| 위치 | Before | After |
|---|---|---|
| `app/me/survey/page.tsx` | "아직 준비된 설문이 없어요." | "아직 준비된 연애 성향 테스트가 없어요." |
| `app/onboarding/survey/page.tsx` | "아직 준비된 설문이 없어요. 운영자에게 문의해주세요." | "아직 준비된 연애 성향 테스트가 없어요. 운영자에게 문의해주세요." |
| `components/operator/dashboard-widgets.tsx` | "설문 편집" QuickLink | "연애 성향 테스트 편집" |
| `components/operator/surveys-tabs.tsx` | aria-label "설문 하위 메뉴" | "연애 성향 테스트 하위 메뉴" |
| `README.md` line 9 | "설문 응답" | "연애 성향 테스트 응답" |
| `README.md` line 10 | "본인 프로필 / 이상형 / 설문 응답" | "본인 프로필 / 이상형 / 연애 성향 테스트 응답" |
| `README.md` line 11 | "표준 설문 비교" | "연애 성향 테스트 비교" |
| `README.md` line 92 (사이트맵 주석) | "기본 + 이상형 + 설문 응답" | "기본 + 이상형 + 연애 성향 테스트 응답" |
| `README.md` line 94 | "표준 / 커스텀 설문 편집" | "표준 / 커스텀 연애 성향 테스트 편집" |
| `README.md` line 151 | "preferences/survey (skip 가능)" + "프로필·이상형·설문" | "preferences/survey (skip 가능)" 그대로 (코드 라우트명) + "프로필·이상형·연애 성향 테스트" |
| `README.md` line 153 | "본인 프로필 / 이상형 / 설문 응답 수정" | "본인 프로필 / 이상형 / 연애 성향 테스트 응답 수정" |
| `README.md` line 154 | "표준 설문 비교" | "연애 성향 테스트 비교" |

**유지 (코드 주석 + 변수·테이블·URL)**:
- `app/me/page.tsx:55` 주석 "// 설문 응답 완성도" — 코드 주석이라 유지 가능. worker 가 자연스러우면 "// 연애 성향 테스트 응답 완성도" 갱신, 기술 주석으로 유지해도 OK
- `lib/db/surveys.ts` / `surveys` 테이블명 / `/surveys/*` 운영자 라우트 URL / `ensureStandardSurvey` 함수명 / `SurveyEditor` 컴포넌트 등 — 모두 유지

**선택 처리 (worker 자연 판단)**:
- 운영자 측 사이트 nav `/surveys` 의 탭 라벨 — "설문" 으로 단순하게 유지하거나 "연애 성향 테스트" 로 일관. worker 가 보고 결정. 결정 로그는 일관 추천 (운영자 도구도 같은 대상 호칭).

### D5. 사이트맵·README 동기화

- `README.md` 의 사이트맵·운영 흐름 안내에서 `/pending` 언급 제거
- `CLAUDE.md` §7 사이트맵에서 `/pending` 행 제거 + V2.x 폐기 라우트 줄에 추가
- `CLAUDE.md` §4 디렉토리 구조의 `app/pending/` 주석 제거
- `lib/auth/onboarding.ts` 의 헤더 주석 (line 12 "pending + step=null → 호출 측이 /pending 등 분기") 도 갱신

## 근거

- 011 결정 (`/pending` 액션 카드 추가) 의 자연 연장. `/me` 의 같은 카드 3개가 같은 진입점
  역할을 하므로 두 페이지의 중복이 의미 없어짐.
- "직접 안내드릴게요" 가 거짓 약속이라는 사용자 명시 (오늘 결정). PR #21 의 카피 일반화가
  채널 ("카톡") 만 일반화했지 안내 행위 자체의 존재성은 미검토.
- PRD non-goal "결과 외부 공유" + V1 매칭 결과 가입자 표시 부재 = "사이트 재입장으로 확인"
  도 정확하지 않은 표현. 가장 정직한 톤은 안내 약속 없이 검토·매칭 사실만.
- `/pending` 외부 링크 호환은 가드 흡수 (`/me` redirect) 로 보존. 라우트 폐기의 정신과
  외부 링크 깨짐 방지 둘 다 만족.

## 거절된 대안

- **`/pending` 유지 + 카피만 정정** — `/me` 와 액션 카드 중복 그대로. 011 변경 이후의 합리적
  단순화 기회 상실.
- **"사이트 재입장으로 확인" 같은 톤으로 카피 정정** — 매칭 결과 표시가 V1 범위 외라
  여전히 정확한 통보 경로 아님. 약속만 약하게 한 것일 뿐 거짓 약속에 가까움.
- **`/pending` 파일을 redirect 핸들러로만 남기기 (`redirect("/me")`)** — Next.js 의 route
  파일이 남아있으면 라우트는 등록된 상태. 가드 단계에서 흡수가 더 깔끔하고 라우트 자체
  제거가 의도 명확.
- **비로그인의 `/pending` 진입을 announcement 로 유지** — 폐기된 라우트라 announcement
  자격 박탈이 정합. 외부 링크 호환은 `/login` 흡수로 대체 (`/login` 가드가 다음 hop 처리).
- **하단 footer 카피 정정하되 유지** — 배너만으로 안내 충분. footer 가 또 다른 약속 자리가
  되면 미래에 다시 카피 거짓성 검토 필요. 삭제가 단순.

## 후속 영향

- **외부 링크 / 북마크 호환**: `/pending` URL 진입은 가드 흡수로 자연 동작. 단 비로그인이
  과거 `/pending` 북마크 진입 시 이제 `/login` 으로 (이전: pass) — 외부 링크 호환 측면
  사실상 동등.
- **announcement 라우트는 `/rejected` 만 남음** — `isAnnouncementRoute` 함수 단순화 또는
  inline 분기 가능. 함수 이름이 의미를 잃지 않게 worker 가 판단.
- **`onboarding.ts:12` 헤더 주석** 갱신 — "/pending 등 분기" → "/me 분기"
- **결정 로그 011 §D1·D3 → D4 의 무효화**: 011 의 매트릭스 표가 본 결정으로 일부 갱신.
  본 결정 로그가 011 의 후속 정리임을 명시.
- 가드 단위 테스트 `tests/unit/proxy.test.ts` 에서 011 의 NEW 행 5개 (pending+null × /me/*)
  는 그대로 유지 + 본 결정의 NEW 행 추가 (pending+null × /pending → /me).
- PR #22 의 `/pending` 페이지 컴포넌트 테스트 `tests/unit/pending-page.test.tsx` 는 **삭제** —
  라우트 자체가 사라지므로 spec 도 사라짐. test-writer 가 작성 시 삭제 + 그 자리에 비로그인·
  운영자 `/pending` 흡수 spec 신설.

## TDD 게이트 요구사항

- 단위 `tests/unit/proxy.test.ts` — D1 매트릭스 표의 6 행 추가/변경, 5 회귀 행 유지
- 단위 — `app/pending/page.tsx` 파일 부재 검증 (또는 import 시도 X 로 자연 검증)
- 단위 — `app/me/page.tsx` 의 새 카피 (배너 description / 하단 카피 부재) RTL 검증
- 통합 — `resolveOnboardingResumeTarget` fallback 변경 (호출처가 `?? "/me"` 로 통일)
- E2E 골격 — pending+onboarded 가입자가 `/pending` 직접 진입 → `/me` 흡수 / `/me` 배너에
  "직접 안내" 문구 없음
- 회귀 — rejected 가입자 → `/rejected` / approved 가입자 → `/me` / 비로그인 → `/login` /
  운영자 → `/` 모두 유지

## 디자이너 게이트

생략. 사유: 새 페이지·컴포넌트 정의 없음. 카피 정정 + 라우트 폐기 + 가드 분기 변경
모두 기존 UI 프리미티브 (`StatusBanner`, `MeSectionCard`) 그대로 사용. 톤 합의 불필요.

## TDD 게이트 결과 (2026-05-13)

test-writer 라운드 1 채택. 신규 빨강 20 (proxy 4 + me-copy 8 + wording 8) + E2E 4 baseline.
회귀 추가 없음. spec 약화 제안 없음.

작성된 파일:
- `tests/unit/proxy.test.ts` (수정) — D1 매트릭스 신규 4 행 (비로그인 /pending → /login,
  pending+null × /pending → /me, pending+null × /onboarding/* → /me, pending+null ×
  /friends → /me) + 011 회귀 행 유지 + announcement /rejected 잔존 검증
- `tests/unit/pending-page.test.tsx` **삭제** (라우트 폐기)
- `tests/unit/me-page-copy.test.tsx` (신설) — D3 카피 정직성 8건, 소스 텍스트 검사
- `tests/unit/wording-survey-test.test.tsx` (신설) — D4 워딩 정합 8건, 카피 파일 4개
- `e2e/tests/pending-deprecation.spec.ts` (신설) — pending /pending → /me 흡수, 비로그인
  /pending → /login 흡수, /rejected 회귀

worker 통과 목표:
- 신규 단위 빨강 20 전부 초록
- baseline (`tests/unit/auth-user.test.ts` 7건) 그대로
- E2E 4 는 fixture 부재 baseline (011 패턴 동일) — 통과 목표 외
- `npm run lint` / `npm run build` / `tsc --noEmit` 통과

worker 자율 정책 (test-writer 가 식별):
- 운영자 nav `/surveys` 탭 라벨 ("템플릿") — D4 §선택 처리 그대로 worker 판단
- `app/me/page.tsx:55` 코드 주석 "// 설문 응답 완성도" — D4 §유지 그대로 worker 판단
- README.md 카피 갱신 (worker 가 D4 표 따라 — spec 검증 대상 외)
- `lib/auth/onboarding.ts` 의 fallback / 호출처 정합 — worker 가 변경 시 라운드 3 단위
  spec 보강 후보 (현재는 가드 단위 spec 으로 행위 커버)

향후 후속 (본 PR 외):
- `resolveOnboardingResumeTarget` 단위 spec 보강 (P2)
- `me-page-copy.test.tsx` 의 소스 텍스트 검사 방식 — 카피가 컴포넌트화/i18n 으로 옮기면
  spec 갱신 필요 (현재는 server component 라 RTL 표면 넓음을 회피한 접근)
