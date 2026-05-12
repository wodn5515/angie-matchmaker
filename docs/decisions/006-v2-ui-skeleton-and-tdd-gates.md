# 006-v2-ui-skeleton-and-tdd-gates: V2 UI 골격 채택 + TDD 게이트 적용 방침

> 작성: 2026-05-12  /  작성자: Lead 에이전트
> 관련 작업: `feature/v2-self-signup-full` 브랜치
> 관련 자료: [`docs/decisions/004-v2-self-signup-direction.md`](./004-v2-self-signup-direction.md), [`docs/decisions/005-v2-single-pr-rollout.md`](./005-v2-single-pr-rollout.md), [`docs/PRD.md`](../PRD.md)

## 배경

decisions/005 의 단일 PR 정책 하에 V2 코드 작업을 시작. SKILL §2.4 디자이너 게이트 + §2.5 TDD 게이트에 해당 (신규 페이지 레이아웃 + UI 프리미티브 확장 + 새 라우트 + 폼 + 인증·세션 + 데이터 모델 변경 모두 포함).

디자이너 단발 호출 결과(커밋 `eb671ff`) 와 TDD 게이트 진행 방침을 여기에 정리한다.

## 결정

### D1. 디자이너 산출물(커밋 eb671ff) 전량 채택

디자이너 한 커밋(30 파일, +2698)으로 V2 UI 골격을 잡았고 tsc/eslint 모두 통과. 다음 산출물을 그대로 채택:

- **디자인 토큰** `app/globals.css` — `.user-shell` 신설, `.pink-soft-glow`, 비교 뷰 시각 단서 `.match-cell-{same,partial,different,neutral}` 추가
- **UI 프리미티브 6개** (`components/ui/`) — `stepper`, `tab-bar`, `multi-select-chip`, `range-slider`, `ranking-picker`, `field` 자체 작성 (cva 미사용 유지)
- **옵션 사전** `lib/types/v2-options.ts` — V2 enum/지역/직업/키워드/우선순위 사전
- **가입자 측 페이지 골격** — `/signup`, `/onboarding/{profile,preferences,survey}`, `/me`, `/me/{profile,preferences,survey}`, `/pending`, `/rejected`
- **가입자 도메인 컴포넌트** (`components/user/`) — `user-shell`, `onboarding-step-header`, `me-section-card`, `status-banner`
- **운영자 신규 도메인 컴포넌트** (`components/operator/`) — `dashboard-widgets`, `friends-status-tabs`, `friend-ideal-section`, `ideal-match-row`, `review-actions` + `nav.tsx` 의 `/surveys`·`/matches` 제거

### D2. `friend-shell` → `user-shell` rename 정책

디자이너의 자율 판단 채택:

- 신규 클래스 `.user-shell` 을 `app/globals.css` 에 신설하고 V2 가입자 측 페이지에서만 사용
- V1 `.friend-shell` 은 한 PR 안에서도 V1 ↔ V2 톤 경계를 명확히 하기 위해 **임시 보존**
- Task-F (V1 라우트 폐기) 단계에서 worker 가 `.friend-shell` 일괄 제거

도메인 용어가 PRD §2.2 ("Friend = Self-signup User") 와 DB 테이블명(`friends` 그대로 — §4.2)이 mixed 인 상황을 인정. 코드의 사용자 가시 톤 (CSS 클래스) 은 V2 의미로 가되, 데이터 모델 식별자는 V1 그대로 유지하는 게 마이그레이션 부담 ↓.

### D3. 운영자 측 page 본체는 worker 가 교체 (디자이너 미수정)

운영자 page (`app/(operator)/page.tsx`, `friends/page.tsx`, `compare/*`) 들이 V1 데이터 헬퍼 (`listFriends`, `listAllInvitationsForOwner`, `recentPairs`) 에 강결합. 디자이너가 page 본체를 V2 골격으로 바꾸면 Task-A (마이그레이션 + 타입) 머지 전까지 빌드가 깨짐.

따라서:
- 디자이너는 신규 컴포넌트만 자리 잡아두고 page 본체 교체는 worker 의 몫
- worker 는 Task-A (DB·인증·타입) → Task-D (운영자 page 본체) 순서로 점진 통합

### D4. TDD 게이트 — test-writer 단발 호출로 V2 spec 선작성

PRD §3 기능 전반이 SKILL §2.5 의 "test-writer 선호출 필수" 케이스에 정합:
- 새 라우트 (`/signup`, `/onboarding/*`, `/me/*`, `/pending`, `/rejected`)
- 폼 제출·검증 (가입 폼, 이상형 폼, 설문 응답)
- 세션·인증·권한 게이트 (`OPERATOR_EMAIL` × OAuth user × `friends.status` 매트릭스)
- 비즈니스 룰 (가입자 자기 row 만 접근 / 운영자 모든 row 접근 / 가입 도중 이탈 후 onboarding_step 으로 이어 풀기)
- 비교 뷰 (이상형 양방향 매칭 색상 단서)
- 데이터 모델 변경 (`0003_v2_self_signup.sql` 통합 테스트로 검증)

test-writer 가 빨갛게 실패하는 spec (E2E + 통합 + 단위 스켈레톤) 을 선작성한 뒤 Lead 가 자율 채택. 단발 호출이며 사용자 승인 게이트 없음.

### D5. TDD 게이트 spec 범위 분할 (test-writer 호출 시 명시)

V2 PRD §3 전체를 한 spec 라운드로 잡으면 test-writer 호출이 무거워짐. 다음으로 분할 호출하거나, test-writer 가 우선순위로 잘라 P0 만 선작성:

- **P0 (커밋 단위 통과 필수)**
  - `proxy.ts` 가드 단위 — OAuth × 화이트리스트 × status 매트릭스 8 케이스
  - 마이그레이션 적용 후 핵심 제약/인덱스 검증
  - 가입자 vs 운영자 row 접근 권한 차단
  - 가입 도중 이탈 후 onboarding_step 으로 이어 풀기
  - 이상형 양방향 비교 색상 분기 (compareValues V2)
- **P1 (다음 라운드 후보)**
  - 가입자 측 E2E 가입 ~ /me 진입 한 흐름
  - 운영자 심사 액션 (승인/거절) E2E
  - 설문 답변 upsert (`survey_answers` 새 키 `(friend_id, question_id)`)

P1 spec 도 가능하면 한 번에 포함. test-writer 가 무리라 판단하면 P0 만 잡고 P1 은 Task 단계별 보완 가능 — Lead 판단.

## 근거

- 디자이너가 단일 커밋으로 깔끔하게 골격 잡았고 tsc/eslint 통과 → 채택 비용 없음
- `friend-shell` → `user-shell` rename 의 임시 공존은 V2 도메인 톤 명확화 + 정리 시점 통제 이중 효과
- 운영자 page 본체 미수정은 디자이너의 "범위 분할 보고" 의 합리적 적용 (Task-A 머지 전 빌드 깨짐 회피)
- TDD 게이트 P0/P1 분할은 test-writer 단발 호출의 응답 크기를 적정선으로 유지

## 거절된 대안

### A. 디자이너 호출 없이 worker 가 UI 까지 한 번에 진행
- V2 PRD §3 UI 범위가 광범위(가입자 측 신규 페이지 7개 + 운영자 측 재구성 + 신규 프리미티브 6개) — worker 가 비즈니스 로직과 UI 를 동시 처리하면 한 commit 의 변경 폭이 과도
- 디자이너 게이트의 SKILL §2.4 적용 기준에 정확히 부합 (신규 페이지 레이아웃 + 신규 UI 프리미티브 + 디자인 시스템 변경)
- 채택 안 함

### B. `friend-shell` 즉시 제거 (V1 ↔ V2 톤 동시 정리)
- V1 라우트 (`/r/[token]`, `/s/[token]`) 가 Task-F 까지 살아 있어야 빌드 통과 — 그동안 `friend-shell` 클래스도 살아 있어야 함
- Task-F 에서 일괄 제거가 합리적
- 채택 안 함

### C. 운영자 page 본체도 디자이너가 V2 골격으로 한 번에 교체
- V1 데이터 헬퍼 강결합 상태에서 page 본체 교체 시 Task-A 머지 전 빌드 깨짐
- 디자이너 작업이 한 커밋 안에서 commit-by-commit 검토를 어렵게 만듦
- 채택 안 함

### D. TDD 게이트 생략 (디자이너 골격 + worker 구현만)
- V2 범위가 PRD §3 의 다수 "test-writer 선호출 필수" 케이스에 정합 — 생략 시 회귀 위험 ↑
- SKILL §2.5 의 사유 명시 흐름과도 충돌
- 채택 안 함

## 후속 영향

- 다음 단계: test-writer 단발 호출 → 빨갛게 실패 확인 → Lead 자율 spec 채택 → 결정 로그에 spec 시나리오 append
- 그 다음: 팀 spawn (worker / lint / sfx) → worker 가 PRD §12 의 Task-A~G 시퀀스대로 commit 누적
- Task-F 단계에서 `.friend-shell` 클래스 제거 명시 (worker 프롬프트에 포함)
- 운영자 측 page 본체 교체는 Task-A (타입·헬퍼) → Task-D (page 본체) 순서로 의존성 유지
