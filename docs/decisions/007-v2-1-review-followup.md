# 007-v2-1-review-followup: V2.1 — PR #10 리뷰 코멘트 후속 정리

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: `feature/v2-1-followup` 브랜치
> 관련 자료: [`docs/decisions/004-v2-self-signup-direction.md`](./004-v2-self-signup-direction.md), [`docs/decisions/005-v2-single-pr-rollout.md`](./005-v2-single-pr-rollout.md), [`docs/decisions/006-v2-ui-skeleton-and-tdd-gates.md`](./006-v2-ui-skeleton-and-tdd-gates.md), PR #10 (https://github.com/wodn5515/angie-matchmaker/pull/10)

## 배경

PR #10 (V2 단일 PR 전환) 머지 후의 follow-up. 사용자가 직접 작성한 종합 리뷰 코멘트와 worker 의 PR 생성 보고에서 머지 차단 아닌 `🟡 should` / `🟢 nit` 항목 9건이 식별됐다. PR #10 본문에서 "후속 PR" 로 분리하기로 명시한 부분.

decisions/005 에서 V1 → V2 단절 전환은 단일 PR 로 묶었지만, V2 머지 후의 V2.x 변경은 정상 분할 PR 로 복귀한다고 §"V2.x 확장 시" 에서 명시한 흐름. 이 PR 은 그 첫 V2.x.

## 결정

다음 9건을 단일 PR `feature/v2-1-followup` 으로 묶어 진행한다. 각 항목 = 1 commit (commit-by-commit 리뷰 가능).

### 사용자 리뷰 🟡 should (3건)

**D1. `saveMeAnswerAction` server-side value validation** — `app/me/survey/actions.ts`

`question.type` / `question.options` 기반 검증을 server side 에 추가:
- `mcq_single` → `typeof value === "string" && options.includes(value)`
- `mcq_multi` → `Array.isArray(value) && value.every(v => options.includes(v))`
- `likert` → `Number.isInteger(value) && opts.min <= value <= opts.max`
- `ranking` → `Array.isArray(value)` 이고 옵션 셋과 동치 (중복 없음)
- `text` → `typeof value === "string" && value.length <= 2000`

`select("id, chapter_id, type, options")` 로 두 컬럼 더 가져오는 변경.

**D2. `upsertFriendIdealAggregate` RPC 통합** — `lib/db/ideals.ts` + `supabase/migrations/0004_v2_1_followup.sql`

5+1 테이블 (`friend_ideals` + `friend_ideal_{regions,hometowns,jobs,personality_keywords,priorities}`) 의 순차 delete/insert 가 부분 실패 시 데이터 손실 가능. Postgres function `upsert_friend_ideal_aggregate(...)` 로 한 트랜잭션 안에 묶어 service-role 에서 RPC 호출. ACID 보장.

**D3. `rejectFriendAction` `rejected_reason` 길이 제한** — `app/(operator)/friends/[id]/actions.ts`

`String(formData.get("rejected_reason") ?? "").trim()` → `z.string().trim().max(2000)` 으로 통일 (운영자 `notes` 와 동일 규약).

### 사용자 리뷰 🟢 nit (3건)

**D4. OAuth 콜백 redirect 분기** — `app/signup/page.tsx`, `app/auth/callback/route.ts`

`/signup` 의 `signInWithOAuth` 에서 `redirectTo: ".../auth/callback?from=signup"` 1-bit hint 추가. 콜백 실패 시 `from=signup` 이면 `/signup?error=oauth_failed`, 아니면 `/login?error=oauth_failed`.

**D5. 마이그레이션 멱등성 보강** — `supabase/migrations/0004_v2_1_followup.sql`

`0003_v2_self_signup.sql` 의 `drop column closeness/how_we_met/kakao_id/phone` 에 `if exists` 부재. **0003 직접 수정 X** (이미 머지·적용된 마이그레이션은 보존) — 대신 0004 의 시작부에 `drop column if exists` 형태의 멱등성 가드를 한 번 더 두어 fresh install 시 재실행 가능하도록.

**D6. `proxy.ts` redirect 시 query string 보존** — `lib/supabase/proxy.ts`

`url.search = ""` 로 일괄 제거하지 말고 redirect target 에 따라 분기: `?error=...` 같은 안내 param 은 보존하는 게 명시적으로 안전 (현재는 OAuth 콜백 직접 redirect 에서 우연히 동작). 또한 `/auth` prefix 일관성 — `pathname === "/auth"` + `startsWith("/auth/")` 동시 체크.

### worker 보고 🟢 nit (3건)

**D7. `saveMeAnswerAction` question owner 3-hop fetch 캐싱** — `app/me/survey/actions.ts`

`survey_questions → survey_chapters → surveys.owner_id` 체인 검증이 매 답변 저장마다 3 query. owner 당 표준 설문 1개 가정(`surveys.is_standard = true` UNIQUE per owner) 하에 인메모리 또는 한 join 으로 단축.

**D8. `getCurrentUser` + `ensureNotOperator` `supabase.auth.getUser` 중복 호출 통합** — `lib/auth/user.ts`

두 함수가 같은 호출을 따로 함. 한 헬퍼(`fetchAuthAndOperatorStatus`)로 묶어 한 번만 호출.

**D9. `proxy.ts` `/auth` prefix 일관성** — D6 안에 포함 (같은 영역).

### 적용 방침 통일

- **마이그레이션은 0004 신규 추가** — 0003 직접 수정 X. Supabase migration 추적 hash conflict 회피.
- **테스트 변경**: 기존 P0 spec 은 그대로 유지하고 새 검증 로직만 spec append. test-writer 단발 호출로 새 spec 빨갛게 작성 후 worker 채움.
- **결정 로그 spec 시나리오는 test-writer 보고 후 이 파일에 append**.
- **UI 변경 없음** → 디자이너 게이트 skip (SKILL §2.4 대상 아님).
- **`saveMeAnswerAction` value validation (D1)** 가 V2.1 의 P0 — 사용자가 명시한 우선순위.

## 근거

### 단일 PR 정책 (decisions/005) 와의 일관성

decisions/005 가 V1 → V2 단절 전환에 한정해 단일 PR 권장. V2.1 이후는 정상 분할 PR 복귀. 다만 이번 9건은 모두 PR #10 리뷰 후속이라 한 PR 로 묶는 게 자연 — 사이즈도 작고 (마이그레이션 1 + lib/db 1 + lib/auth 2 + actions 2 + auth 1 + proxy 1) commit-by-commit 분리 가능.

### 마이그레이션 보존 원칙

이미 사용자 콘솔에서 적용됐을 가능성이 있는 0003 을 직접 수정하면 Supabase migration hash 추적과 충돌. 0004 신규 추가가 안전 + 향후 fresh install 시점에서도 멱등성 회복.

### TDD 게이트 적용

- D1 server-side validation, D2 RPC 통합, D3 zod 제한, D4 OAuth redirect 분기, D6 proxy redirect search 보존 — 모두 SKILL §2.5 의 "test-writer 선호출 필수" 케이스 (server action 검증 / 비즈니스 룰 / proxy 가드).
- D7 캐싱, D8 헬퍼 통합 — 내부 리팩토링이지만 외부 동작 보존 회귀 spec 으로 안전망.

## 거절된 대안

### A. 9건을 각각 별 PR (#1 / #2 / #3 / ...)

- PR overhead 9배 — 토이 단계에 ceremony 과다
- 각 항목이 작아서 단일 PR commit-by-commit 리뷰로도 충분
- decisions/005 V2.x 복귀 정신은 "정상 분할 PR 가능" 이지 "분할 의무" 아님
- 채택 안 함

### B. 머지된 0003 직접 수정 (`if exists` 추가)

- Supabase migration hash 추적과 충돌 가능
- 이미 적용된 환경에 영향 없음 (단순 멱등성 보강) — 굳이 0003 건드릴 이유 약함
- 0004 신규 추가가 표준
- 채택 안 함

### C. D2 (RPC 통합) 를 V2.2 로 미루기

- 부분 실패 시 데이터 손실 가능성이 V2.1 P1 — 가입자 데이터 신뢰성 직결
- 같은 PR 안에서 마이그레이션 0004 추가하는 김에 같이
- 채택 안 함

### D. D7 / D8 캐싱·통합을 별 refactor PR 로

- 두 항목 합쳐 lib/auth/* + lib/db/answers.ts 약 ~50 LOC 변경 — 단일 PR 에 묶어도 부담 없음
- 채택 안 함

## 후속 영향

### 코드 변경 범위

| 영역 | 파일 | 변경 |
|---|---|---|
| 마이그레이션 | `supabase/migrations/0004_v2_1_followup.sql` (신규) | RPC function + 0003 멱등성 가드 |
| DB 헬퍼 | `lib/db/ideals.ts` | `upsertFriendIdealAggregate` RPC 호출로 교체 |
| Server action | `app/me/survey/actions.ts` | value validation + 3-hop 캐싱 |
| Server action | `app/(operator)/friends/[id]/actions.ts` | `rejected_reason` zod max(2000) |
| Auth | `lib/auth/user.ts` | `getCurrentUser` + `ensureNotOperator` 헬퍼 통합 |
| OAuth | `app/signup/page.tsx`, `app/auth/callback/route.ts` | `?from=signup` round-trip |
| Routing | `lib/supabase/proxy.ts` | search 보존 + `/auth` prefix 일관성 |

### CLAUDE.md 사실 영역 동기화

- §6 데이터 모델 — 0004 마이그레이션 추가 (RPC function 명시)
- §11 환경 변수 — 변화 없음

### README.md

- "기술 스택" / "사이트맵" / "데이터 모델" — 변화 없음 (외부 동작 동일, 정합성·보안 보강만)
- 동기화 불필요

### V2.2 검토 항목 (지금 결정 안 함)

- V1 → V2 마이그레이션 cleanup (0003 의 `if exists` 부재가 retroactive 보강됐으므로 더는 retroactive 항목 없음)
- E2E P1 8 케이스 storageState 픽스처 + 시드 셋업 (사용자 측 후속)
