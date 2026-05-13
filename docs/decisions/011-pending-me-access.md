# 011-pending-me-access: 심사 대기(pending) 가입자에게 /me/* 접근 허용

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: feature/pending-me-access

## 배경

V2 가드 (`lib/auth/guard.ts`) + `requireApprovedUser` (`lib/auth/user.ts`) 가 모두
`status='pending'` 인 가입자를 `/me/*` 에서 차단하고 `/pending` 안내 페이지로 강제
redirect 한다. 그런데 `/pending` 페이지 본문에는 "프로필 채우기 / 이런 분 / 연애 성향
테스트 도 미리 작성 가능" 안내가 적혀있어서, 사용자가 그 안내대로 행동하려고 해도
어디로 가야 하는지 알 수 없고, URL 을 직접 친다 해도 가드·페이지 양쪽이 막는다.

PR #21 의 카피 일반화 작업으로 안내문구가 더 명시적으로 "기다리는 동안 할 수 있는 것"
이라고 굳어진 만큼, 안내와 실제 동작의 mismatch 를 이번 작업에서 해소한다.

## 결정

### D1. 가드 매트릭스 확장 — pending + 온보딩 완료 가입자도 `/me/*` 통과

`lib/auth/guard.ts` `resolveGuardTarget` 의 `status === "pending"` 분기에서,
`onboarding_step == null` (온보딩을 마치고 심사 대기 중) 인 경우 `/me/*` 도 pass
대상에 포함한다.

| status   | onboarding_step | pathname       | Before              | After                            |
|----------|-----------------|----------------|---------------------|----------------------------------|
| pending  | null            | `/pending`     | pass                | pass (회귀 유지)                 |
| pending  | null            | `/me`          | redirect `/pending` | **pass (NEW)**                   |
| pending  | null            | `/me/profile`  | redirect `/pending` | **pass (NEW)**                   |
| pending  | null            | `/me/preferences` | redirect `/pending` | **pass (NEW)**               |
| pending  | null            | `/me/survey`   | redirect `/pending` | **pass (NEW)**                   |
| pending  | null            | `/me/survey/0` | redirect `/pending` | **pass (NEW)**                   |
| pending  | null            | `/onboarding/*` | redirect `/pending` | redirect `/pending` (회귀 유지) |
| pending  | 2 (미완)        | `/me/*`        | redirect resume     | redirect resume (회귀 유지)      |
| approved | null            | `/me/*`        | pass                | pass (회귀 유지)                 |
| rejected | —               | `/me/*`        | redirect `/rejected`| redirect `/rejected` (회귀 유지) |

핵심: 온보딩을 끝낸 pending 사용자에게만 `/me/*` 가 열린다 — 온보딩 미완(`onboarding_step != null`)
은 그대로 onboarding resume 으로 보낸다.

### D2. `requireApprovedUser` 의 status 게이트 완화 → `requireOnboardedUser` 신설

가드만 풀어도 페이지 레벨에서 `requireApprovedUser()` 가 `status==='pending'` 일 때
`/pending` 으로 강제 redirect 하므로 (`lib/auth/user.ts:143`), `/me/*` 페이지·actions 는
실제로 들어오지 못한다. 두 길을 함께 풀어야 한다.

방향: **새 함수 `requireOnboardedUser()` 를 추가**해 `/me/*` 페이지·actions 가 사용하도록
마이그레이션한다.

- `requireOnboardedUser()` 통과 조건:
  - OAuth 세션 있음
  - friends row 있음
  - `status === "approved"` **또는** (`status === "pending"` 이면서 `onboarding_step == null`)
  - 그 외:
    - 비로그인 → `/login` (010 이후 통합 진입점)
    - friends row 없음 → `/onboarding/profile`
    - pending + onboarding 미완 → `/onboarding/<resume>` (resolveOnboardingResumeTarget)
    - rejected → `/rejected`
- 반환 타입은 기존 `UserSession` 그대로. `status` 필드가 노출되므로 페이지 컴포넌트가
  필요 시 "심사 대기 중" 배너를 띄울 수 있다.

`requireApprovedUser()` 는 deprecated 표시 + 유지 — 외부 spec 호환 (`tests/unit/auth-user.test.ts`)
때문에 시그니처는 보존한다. 호출처를 전부 `requireOnboardedUser` 로 갈아치우면 자연
사장된다. 본 PR 범위에서는 `/me/*` 페이지·actions 만 마이그레이션:

- `app/me/page.tsx`
- `app/me/profile/page.tsx`, `app/me/profile/actions.ts`
- `app/me/preferences/page.tsx`, `app/me/preferences/actions.ts`
- `app/me/survey/page.tsx`, `app/me/survey/actions.ts` (이건 `getCurrentUser` 사용 중이라
  status 가드를 추가하는 형태로 별도 처리 — 본 결정 외)
- `app/me/survey/[chapter]/page.tsx`

### D3. `/pending` 페이지에 액션 카드 3개 추가

안내문구 (`기다리는 동안 할 수 있는 것`) 를 단순 문장에서 **클릭 가능한 액션 카드** 로
업그레이드:

- "프로필 채우기" → `/me/profile`
- "이런 분이면 좋겠어요" → `/me/preferences`
- "연애 성향 테스트 하기" → `/me/survey`

기존 UI 프리미티브 (`MeSectionCard` 또는 동등한 카드 + 링크) 로 충분. 새 컴포넌트
정의는 피한다. 디자이너 호출은 생략 — 새 페이지·새 프리미티브가 아니라 기존 페이지
본문 교체이고, 모바일 우선 다크 톤은 friend-shell 컨테이너가 이미 깔고 있다.

### D4. status 필드 노출 — 페이지 상단 안내 배너

pending 가입자가 `/me/*` 에 들어오면 페이지 상단에 가벼운 "심사 대기 중 — 미리 채워두면
운영자가 더 빨리 검토해요" 배너를 띄워 자기 상태를 헷갈리지 않게 한다. approved 가입자는
배너 미노출. 구현은 `UserShell` 내부에 `status` prop 을 받아 분기하거나 페이지 컴포넌트
레벨에서 `<StatusBanner tone="pending">` 한 줄 — worker 가 가장 침습 적은 형태로 선택.

## 근거

- PR #21 에서 카피만 일반화해놓고 동작은 그대로 둔 채 끝낸 미해결 부분. 안내 ↔ 동작
  mismatch 를 동시 해소해야 사용자가 안내를 신뢰할 수 있다.
- 가드만 풀고 페이지 함수는 그대로 두면 무한 redirect 로 회귀. 한쪽만 풀고 끝낼 수 없다.
- 새 함수 분리(D2) 가 인플레이스 변경보다 안전: `requireApprovedUser` 의 의미(`status==='approved'`)
  를 그대로 유지하면 다른 호출처 (만약 있다면) 가 깨지지 않는다. 호출처별로 의미를
  검토해 점진 마이그레이션.
- 액션 카드(D3) 가 단순 링크 목록보다 친구 측 다크/핑크 톤과 조화 (운영자 톤 아닌 친구
  톤). 기존 `MeSectionCard` 가 이미 같은 패턴.

## 거절된 대안

- **가드만 풀고 `requireApprovedUser` 그대로 두기** → 페이지 레벨에서 다시 막혀 무한
  redirect 회귀.
- **`requireApprovedUser` 의 내부 동작을 그대로 완화** → 함수명 ↔ 동작 mismatch 발생,
  다른 호출처 안전성 보장 어려움.
- **`/pending` 페이지를 없애고 곧장 `/me` 로 보내기** → 심사 중이라는 사실을 사용자가
  알 수 없고, "심사 대기 → 거절 가능" 경로의 명시성 약화. PRD §3.3.5 의 안내 의도 훼손.

## 후속 영향

- `requireApprovedUser` 호출처가 본 PR 외에도 있다면 (예: 추후 추가될 `/me/*` 라우트)
  새 함수로 갈아치울지 검토해야 한다. 결국 deprecated 함수의 호출처가 0 이 되면 제거.
- `/me/survey/actions.ts` 의 `getCurrentUser` 흐름은 본 결정에서 status 게이트를 추가하지
  않았다 (자동 저장 debounce 가 status 검사 없이도 본인 row 만 만지는 동작) — 별도
  후속 작업으로 정리 가능.
- README.md 의 사이트맵에서 `/pending` 의 "비고" 칸이 "심사 대기 안내 + `/me/*` 진입
  가능" 형태로 갱신 필요.
- CLAUDE.md §7 사이트맵에서 `/pending` 줄도 동일 갱신.

## TDD 게이트

- Unit: `tests/unit/guard.test.ts` — D1 매트릭스 회귀 + 신규 pass 행 검증
- Unit: `tests/unit/auth-user.test.ts` (또는 신설 `requireOnboardedUser` spec) — D2 분기
- Component: `/pending` 페이지에 액션 카드 3개 (각 `/me/*` 링크) — 단위 또는 통합
- E2E: pending 가입자가 `/pending` → 액션 카드 클릭 → `/me/profile` 진입 → 폼 저장 → 다시
  `/pending` 으로 안 튕기는 흐름 (회귀 방지)

## TDD 게이트 결과 (2026-05-13)

test-writer 라운드 1 보고 채택. 17개 빨강 spec 작성 — 분기 누락만 빨강이고 spec 약화
제안 없음.

작성된 파일:
- `tests/unit/proxy.test.ts` (수정 — pending 가입자 describe 를 step=null / step!=null
  두 블록으로 재구성)
- `tests/unit/require-onboarded-user.test.ts` (신설 — 9개 분기 spec)
- `tests/unit/pending-page.test.tsx` (신설 — 액션 카드 3개 + 회귀)
- `e2e/tests/pending-me-access.spec.ts` (신설 — 2개 흐름)

Lead 판단:
- **함수명**: `requireOnboardedUser` 그대로 채택 (D2 명명 유지)
- **카드 selector**: 부분 일치 (`/프로필/`, `/이런 분/`, `/연애 성향/`) 그대로 — worker
  가 카드 라벨을 자연스럽게 다듬을 여지 둠
- **E2E**: fixture 인프라 (`e2e/.auth/user-pending-onboarded.json`) 가 본 spec 의 신규
  요구사항이지만 기존 `signup-onboarding.spec.ts` / `operator-review.spec.ts` 도 같은
  fixture 부재로 baseline 빨강 상태. 011 worker 의 "통과 목표" 는 **단위/컴포넌트
  spec 만 초록** 으로 한정. E2E spec 은 작성 상태로 유지 (인프라 갖춰지면 즉시 동작) —
  fixture 인프라 정비는 별도 후속 작업.
- **baseline 7건 (`tests/unit/auth-user.test.ts`)**: 본 작업과 무관 — `createSupabaseServiceClient`
  mock 누락이라는 별도 이슈. 011 범위 외. 신설 `require-onboarded-user.test.ts` 는 같은
  함정에 빠지지 않게 두 클라이언트 모두 stub.

worker 통과 목표:
- `npm test` 결과에서 11번 항목 관련 신규 빨강 10건 (proxy 5 + require-onboarded 9 중
  approved+null 통과를 빼고 — 실제 빨강 9 + pending-page 3) 전부 초록 전환.
- baseline 빨강 (`auth-user.test.ts` 7건, e2e 12건) 은 그대로 두되 회귀 추가 금지.
