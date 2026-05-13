# 008-v2-routing-display-fixes: V2 routing 매트릭스 + display 라벨 정합성 수정

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: `feature/v2-routing-display-fixes` 브랜치
> 관련 자료: [`docs/decisions/006-v2-ui-skeleton-and-tdd-gates.md`](./006-v2-ui-skeleton-and-tdd-gates.md), [`docs/decisions/007-v2-1-review-followup.md`](./007-v2-1-review-followup.md), [`docs/PRD.md`](../PRD.md) §5.5

## 배경

stage 에 V2 (PR #10) + V2.1 (PR #11) 머지된 상태에서 사용자가 prod 배포 PR #12 만들기 직전 실제 운영해 보다가 네 가지 버그 발견:

### 사용자 보고 (원문)

> "설문이 있는데 `/onboarding/survey` 에서 시작하기를 누르면 pending으로 리다이렉트 됐다가 pending에서 다시 `/onboarding/profile` 로 리다이렉트 되는 이상한 현상이 있고 거기다 이 유저는 이미 심사가 승인된 유저인데도 이렇게 돼. 그리고 `/` 메인으로 왔을때 `/login` 으로 가버리는데 그건 운영자 전용페이지니까 `/me` 로 가도록 해야하지 않을까? 이 라우팅들이 제대로 안되는거 같아. 그리고 가입자 리스트에서 경기도는 왜 `gyeonggi` 이렇게 영어로 나오고 가입자 디테일에서는 `경기` 로 잘 나오고 직업은 이상하게 `it_dev` 이렇게 영어로 나와 이런거 좀 다 한글로 보이게 정합성 맞춰줘"

### 버그 분석

**B1. approved 유저가 `/onboarding/*` 진입 시 잘못된 리다이렉트 체인**

approved 유저 (이미 심사 통과 + onboarding 완료 + `onboarding_step=null`) 가 `/onboarding/survey` 진입 시:

1. `/onboarding/survey` → `/pending` 으로 리다이렉트
2. `/pending` → `/onboarding/profile` 로 리다이렉트
3. (잠재) `/onboarding/profile` → 다시 다른 곳으로 리다이렉트 — 무한 루프 또는 잘못된 페이지

PRD §5.1 사이트맵상 approved 는 `/me/*` 만 접근, `/onboarding/*` 은 onboarding 진행 중 (`status=pending` + `onboarding_step` 1/2/3) 전용. approved 가 `/onboarding/*` 진입하면 **`/me` (또는 `/me/survey` 같은 대응 페이지) 로 리다이렉트** 가 정답.

마찬가지로 approved 가 `/pending` 진입 시 → `/me` 로 / `/rejected` 진입 시 → `/me` 로.

**B2. 가입자 (approved) 가 `/` 진입 시 `/login` 으로 (운영자 페이지)**

PRD §5.5 가드 매트릭스:

| OAuth | OPERATOR_EMAIL? | friends row | status | 결과 |
|---|---|---|---|---|
| O | ✗ | 있음 | approved | `/me/*` 정상 |

`/` 는 `/(operator)` 그룹 — 운영자 전용. 가입자가 `/` 진입 시 운영자 path 차단 → 자기 페이지 `/me` 로 보내는 게 자연. 현재 가드는 운영자 아닌 사람을 무조건 `/login` 으로 보내는데, OAuth 통과한 approved 가입자는 `/me` 가 정답.

**B3. 가입자 리스트 (`/friends`) 의 region 영문 enum 그대로 표시 (`gyeonggi`)**

가입자 디테일 (`/friends/[id]`) 은 한글 라벨 (`경기`) 변환됨 — `lib/types/v2-options.ts` 의 `REGION_LABELS` 같은 매핑 사용. 리스트 페이지 (`app/(operator)/friends/page.tsx`) 가 raw enum 그대로 표시 — 정합성 깨짐.

**B4. 가입자 리스트의 job 영문 enum 그대로 (`it_dev`)**

B3 와 동일 패턴. 리스트 페이지가 `JOB_LABELS` 매핑 미사용.

## 결정

다음 4건을 단일 PR `feature/v2-routing-display-fixes` 로 묶어 fix. 각 항목 = 1 commit.

### D1. 가드 매트릭스 확장 — approved 가 `/onboarding/*`·`/pending`·`/rejected` 진입 시 `/me` 로

`lib/auth/guard.ts` 의 `resolveGuardTarget` 매트릭스에 approved 분기 추가:

- approved + pathname `/onboarding/*` → `/me` 로 redirect
- approved + pathname `/pending` → `/me` 로 redirect
- approved + pathname `/rejected` → `/me` 로 redirect

또는 그 역 — approved 인 유저의 path 정합 검사를 한 곳에서. 정확한 형태는 worker 자율.

추가로 페이지별 server component 안의 redirect 로직 (`/onboarding/survey/page.tsx` 등) 이 onboarding_step 검사로 approved 를 `/pending` 으로 보내는 잘못된 코드가 있을 수 있음 — 분석 후 가드로 일원화하거나 페이지 redirect 도 정합 맞추기.

### D2. 가드 매트릭스 확장 — approved 가 `/(operator)` path 진입 시 `/me` 로

`/`, `/friends/*`, `/compare`, `/surveys/*`, `/settings` 등 운영자 path. 운영자 화이트리스트 미통과 + approved → `/me` 로 redirect.

기존 매트릭스가 이걸 `/login` 으로 보내는데, OAuth 통과 + friends row approved 면 이미 가입자 세션 있음 → `/me` 가 자연. `/login` 은 로그아웃 상태 전용.

### D3. 가입자 리스트 region label 변환

`app/(operator)/friends/page.tsx` 의 region 표시를 `REGION_LABELS[region] ?? region` 로 변경. lookup 미스면 raw enum fallback.

### D4. 가입자 리스트 job label 변환

D3 와 동일 — `JOB_LABELS[occupation] ?? occupation`.

추가로 리스트에 다른 영문 enum 노출 (gender, preferred_gender, relationship_status, match_interest) 이 있으면 모두 라벨 변환 — 정합성 한 번에.

## 근거

### 가드 매트릭스 누락 분기

PRD §5.5 의 매트릭스가 "기본 케이스" 만 명세했고 path-status 조합의 엣지 (approved 가 onboarding/pending path 진입 / approved 가 운영자 path 진입) 가 명시 안 됨. PR #10 의 worker 가 가드를 작성할 때 이 엣지를 누락 → 페이지별 server component 가 임시 redirect 로 메움 → 잘못된 체인 발생.

해결: 가드 단일 진실원으로 일원화. 페이지별 redirect 는 가드 통과 후 추가 검증만.

### 라벨 변환 일관성

`lib/types/v2-options.ts` 의 `REGION_LABELS`, `JOB_LABELS` 등이 디테일 페이지엔 적용됐는데 리스트 페이지에 누락. PR #10 의 worker 가 운영자 page 본체 교체 (Task-D) 할 때 디자이너의 컴포넌트 (`friends-status-tabs`) 와 page 본체 사이의 label 변환 책임을 일관 안 둠.

해결: 리스트 페이지에서도 동일 lookup 사용.

## 거절된 대안

### A. 페이지별 redirect 만 수정 (가드 매트릭스 안 건드림)

- 페이지별 redirect 가 가드를 보조하는 형태로 살아남으면 향후 같은 엣지 재발 가능
- 가드가 단일 진실원이 되는 게 PR #10 의 D1 (`resolveGuardTarget` 순수 함수 분리) 정신
- 채택 안 함

### B. `/onboarding/*` 와 `/me/*` 를 같은 라우트로 통합

- PRD §5.1 의 사이트맵 명세 그대로 (onboarding = 가입 진행 중, /me = approved 후)
- 통합하면 PRD 자체 갱신 필요 + 디자이너 페이지 골격 재배치 — 변경 폭 큼
- 채택 안 함

### C. raw enum 그대로 두고 CSS·툴팁으로 한글 보강

- 사용자 가시 정합성 깨짐. 데이터 자체는 한글 매핑 있는데 표시만 영문이라 명백한 회귀
- 채택 안 함

## 후속 영향

### 코드 변경 범위 (예상)

| 영역 | 파일 | 변경 |
|---|---|---|
| 가드 | `lib/auth/guard.ts` | approved × path 조합 분기 추가 (B1 + B2) |
| 페이지 | `app/onboarding/{profile,preferences,survey}/page.tsx` | approved 진입 시 redirect to `/me` (가드와 정합 또는 가드만으로 충분하면 페이지 코드 제거) |
| 페이지 | `app/pending/page.tsx`, `app/rejected/page.tsx` | approved 진입 시 redirect to `/me` |
| 운영자 페이지 | `app/(operator)/friends/page.tsx` | REGION_LABELS / JOB_LABELS 등 label lookup 적용 |
| (선택) | `app/(operator)/friends/[id]/page.tsx` | 비교 — 이미 lookup 됐다면 변경 없음 |

### TDD 게이트 적용

- D1·D2 (가드 매트릭스): 기존 `tests/unit/proxy.test.ts` 22 케이스 + `proxy-redirect-search.test.ts` 11 케이스에 신규 분기 spec 추가 (test-writer 단발 호출 — 새 케이스 빨갛게 실패 → worker 통과)
- D3·D4 (라벨 변환): 단위 spec 가치 약함 — 페이지 렌더 컴포넌트 단위 테스트 또는 lookup 함수 분리 후 spec. worker 자율 판단.

### CLAUDE.md / README.md

- 사실 영역 (§3 §4 §6 §7 §11) 변경 없음 (라우팅 가드 매트릭스가 PRD §5.5 그대로 동작하게 만드는 fix 라 사이트맵 변경 아님)
- 동기화 불필요

### PR #12 (stage → master) 와의 관계

이 PR 머지 시 stage 가 새 commit 추가 → PR #12 head 가 자동 갱신. PR #12 본문의 변경 요약은 사용자가 머지 시점에 적절히 갱신 (또는 별도 코멘트로 fix 추가 안내). 별 PR 닫고 다시 만들 필요 없음.

### V2.2 검토 항목 (계속 유지)

- E2E P1 8 케이스 storageState 픽스처 + 시드 데이터 셋업
- (decisions/007 의 V2.2 항목 그대로)
