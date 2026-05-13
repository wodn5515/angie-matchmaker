# 010-v2-unified-login: 로그인·가입 진입점 통합 — `/signup` 폐기 + `/login` 단일 진입

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: `feature/v2-unified-login` 브랜치
> 관련 자료: [`docs/decisions/004-v2-self-signup-direction.md`](./004-v2-self-signup-direction.md), [`docs/decisions/007-v2-1-review-followup.md`](./007-v2-1-review-followup.md) §D4 / [`docs/decisions/008-v2-routing-display-fixes.md`](./008-v2-routing-display-fixes.md), [`docs/PRD.md`](../PRD.md) §5

## 배경

PR #13 머지 후 사용자가 운영 중 단순화 제기:

> "approved되지 않은 유저 그냥 일반인이 오면 어떤 유저든 그냥 동일한 로그인 화면으로 렌더링 해주고 로그인을 했을때 운영자면 그냥 운영자 대시보드가 보이면 되지 않나? 어렵게 할 필요 있나"

현재 V2 구조 (decisions/004 + 007 §D4 + 008):
- `/login` — 운영자용 Google OAuth 진입
- `/signup` — 가입자용 Google OAuth 진입
- `/auth/callback` — 콜백 시 `?from=signup` 1-bit hint round-trip 으로 실패 시 `/signup?error=oauth_failed` vs `/login?error=oauth_failed` 분기 (007 §D4)
- `proxy.ts` `PRE_AUTH_PUBLIC` 에 `/login`, `/signup` 두 path 모두 허용

문제:
- 두 페이지가 거의 동일한 Google OAuth 버튼 한 개 — 같은 진입점을 두 라우트로 분리한 셈
- `?from=signup` round-trip 도 두 페이지로 분리됐기 때문에만 의미 있음
- OAuth 진입 시점엔 운영자/가입자 모를 수밖에 없음 (`OPERATOR_EMAIL` 화이트리스트 비교는 콜백 후 가능)
- 사용자 UX 정신에 부합: "어떤 유저든 동일 로그인 → 운영자면 대시보드 / 가입자면 onboarding"

## 결정

`/signup` 폐기 + `/login` 단일 진입점으로 통합. OAuth 통과 후 콜백에서 운영자 화이트리스트 검사로 분기.

### D1. `/signup` 라우트 폐기

- `app/signup/page.tsx`, `app/signup/signup-form.tsx` 삭제
- `proxy.ts` `PRE_AUTH_PUBLIC` 에서 `/signup` 제거
- 만약 외부 링크 / 북마크 호환 필요하면 `/signup` → `/login` 301 redirect (자율 — 토이라 폐기로 충분)

### D2. `/login` 페이지 카피 통합 — 운영자/가입자 모두 환영

`app/login/page.tsx` 의 카피를 "운영자 전용" 톤에서 "모두 환영" 톤으로 변경:
- 제목: "matchmaker 시작" 또는 "Google 로 시작" (자율)
- 부제: "운영자 계정으로 로그인하거나, 처음이면 자동으로 가입이 진행돼요" 같은 1줄 안내
- CTA: "Google 로 시작" 한 버튼 (기존과 동일, 라벨만)

페이지 URL 은 `/login` 그대로 유지 — 기존 V1 부터의 진입점 + 외부 링크 / Vercel preview 호환.

### D3. `/auth/callback` 분기 단순화

기존 `?from=signup` round-trip 제거. 콜백 흐름:

1. OAuth code 교환 (`exchangeCodeForSession`)
2. 실패 → `/login?error=oauth_failed`
3. 성공 → `auth.getUser` 결과로 분기:
   - `OPERATOR_EMAIL` 화이트리스트 통과 → `/` (운영자 대시보드)
   - 화이트리스트 미통과 → 가입자 진입점. `friends` row 조회 후:
     - row 없음 → `/onboarding/profile`
     - `status='pending'` + `onboarding_step` 있음 → `/onboarding/<step>` (이어풀기)
     - `status='pending'` + `onboarding_step=null` → `/pending`
     - `status='approved'` → `/me`
     - `status='rejected'` → `/rejected`

이 분기는 결국 `proxy.ts` 의 가드 매트릭스와 같은 의도라 **proxy.ts 의 `resolveGuardTarget` 호출로 위임** 또는 callback 안에서 `next='/me'` 같은 sentinel + proxy 가드 가 알아서 정확한 path 로 redirect.

가장 단순한 형태: 콜백이 `next=/` (운영자 추정) 또는 `next=/me` (가입자 추정) 로 보내고 proxy 가드가 실제 status 보고 정확한 path 로 다시 redirect. 한 hop 더 추가되지만 가드 단일 진실원 정신 (008 §D1) 정합.

### D4. `resolveCallbackTarget` 함수 단순화

007 §D4 의 `resolveCallbackTarget({ result, from, isOperator, next })` 시그니처에서 `from` 파라미터 제거:

```ts
export type CallbackInput = {
  result: "ok" | "fail";
  isOperator: boolean;
  next: string;  // 기본 "/me" — proxy 가드가 최종 path 결정
};
export function resolveCallbackTarget(input: CallbackInput): string;
```

`fail` 시 항상 `/login?error=oauth_failed` (이전엔 from=signup 이면 `/signup?error=...` 였음 — 이제 `/signup` 없음).

### D5. PRD §5.1 사이트맵 갱신

가입자 측 라우트 표에서 `/signup` 제거. `/login` 이 "운영자·가입자 공용" 으로 §5.3 → §5.1 또는 별도 섹션으로 이동. PRD §5.5 가드 매트릭스에서 `/signup` 케이스 정리.

## 근거

### 단순화 가치

OAuth 진입 시점엔 사용자 분류 (운영자/가입자) 가 시스템적으로 불가능 — 양쪽이 같은 화면에서 시작하는 게 자연. 두 페이지 분리는 V2 PRD §3.1.1 단계의 "Google OAuth 가입" 과 "운영자 로그인" 을 별 흐름으로 본 인터뷰 결과지만, 실제 코드에선 같은 OAuth 한 호출.

### 008 가드 단일 진실원 정신 강화

008 §D1 이 "가드를 단일 진실원으로" — 페이지별 redirect 보조 제거. 010 의 콜백 단순화도 같은 정신: 콜백이 분기 안 하고 proxy 가드에 위임.

### 007 §D4 retroactive 의미 축소

007 §D4 의 `?from=signup` round-trip 은 `/signup` 페이지가 존재하는 한에서만 의미. `/signup` 폐기되면 자연 사라짐. 결정 로그 007 §D4 본문은 시간순 기록이라 보존, 010 이 위에서 의미를 재정의.

### 마이그레이션 / 데이터 영향 0

코드만 변경. DB 스키마 / 환경 변수 / OAuth 콘솔 설정 모두 그대로.

## 거절된 대안

### A. `/login` 폐기 + `/signup` 으로 통합

- 신규 가입자에게 "가입" 어휘가 친숙 — UX 면 매력
- 다만 V1 부터의 `/login` 외부 링크·북마크 / 운영자 습관 가치 ↑
- `/login` 유지 + 카피만 변경이 비용 작음 (D2)
- 채택 안 함

### B. 두 페이지 그대로 유지 + 콜백만 단순화

- 코드 분리 의미 약하고 사용자가 명시 단순화 권유
- D3 만 적용해도 부분적 단순화지만 D1·D2 까지 가는 게 일관
- 채택 안 함

### C. `/login` + `/signup` 둘 다 유지하되 같은 컴포넌트 렌더

- 의미적 단순화 0 — 라우트 두 개 그대로 = 분기 코드 그대로
- 채택 안 함

## 후속 영향

### 코드 변경 범위

| 영역 | 파일 | 변경 |
|---|---|---|
| 페이지 폐기 | `app/signup/page.tsx`, `app/signup/signup-form.tsx` | 삭제 |
| 페이지 통합 | `app/login/page.tsx` | 카피 변경 (운영자 전용 → 모두 환영) |
| 라우팅 | `lib/supabase/proxy.ts` | `PRE_AUTH_PUBLIC` 에서 `/signup` 제거 |
| 콜백 | `app/auth/callback/route.ts` | `?from=signup` 제거 + `resolveCallbackTarget` 단순화 |
| 콜백 함수 | `lib/auth/callback.ts` | `CallbackInput.from` 제거 + 분기 단순화 |
| (검토) | `lib/auth/guard.ts` | 콜백이 proxy 가드에 위임하는 형태면 가드는 변경 X |

### TDD spec 갱신

worker 가 spec 직접 수정 불가 — test-writer 단발 호출 필요:

- `tests/unit/proxy-redirect-search.test.ts` — `/signup` 관련 케이스 제거 또는 `/login` 으로 변경 (1 케이스)
- `tests/unit/auth-callback-redirect.test.ts` — `from='signup'` 분기 케이스 제거 (3~4 케이스) + 단순화된 분기 케이스 추가
- `tests/unit/proxy-approved-redirects.test.ts` — 영향 없음 (approved 분기)
- `tests/unit/proxy.test.ts` — `/signup` 케이스 있으면 제거

### PRD 갱신

- §5.1 가입자 측 라우트 표 — `/signup` 행 제거
- §5.3 인증 공용 — `/login` 이 "운영자·가입자 공용" 명시
- §5.5 가드 매트릭스 — `/signup` 케이스 정리

### CLAUDE.md / README.md 사실 영역

- §7 라우팅 / 사이트맵 — `/signup` 제거 (worker 가 점검)
- README "사이트맵" / "빠른 시작" — `/login` 톤 통합 시 갱신 (worker 자율)

### 사용자 측 후속 단계 (영향 없음)

- Supabase / OAuth 콘솔 / 환경 변수 변경 없음
- 가입자 측 외부 안내 / 카톡 / 인스타 DM 의 링크가 `/signup` 이라면 `/login` 으로 변경 권장 (또는 D1 의 301 redirect 자율 채택)

### V2.x 백로그 (변동 없음)

- helper 패턴 확장
- 검색 hay 한글화
- E2E P1 storageState 셋업
- self-traits (009 — feature/v2-self-traits 병렬 진행 중)
- 010 unified login (이 PR)

병렬 진행되는 self-traits PR 과의 conflict: 매우 작음 (전자는 friends 컬럼 + 비교 뷰, 후자는 라우팅 + auth). `app/me/` 또는 `app/(operator)/` 영역은 self-traits 가 만짐 — unified-login 은 `app/login/` + `app/signup/` + `auth/callback` + `proxy.ts` 만. 양쪽 머지 시점에 충돌 거의 없음.
