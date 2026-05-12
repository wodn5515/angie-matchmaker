# 005-v2-single-pr-rollout: V2 전환을 단일 PR 로 진행

> 작성: 2026-05-12  /  작성자: Lead 에이전트
> 관련 작업: `meta/v2-single-pr-rollout` 브랜치
> 관련 자료: [`docs/decisions/004-v2-self-signup-direction.md`](./004-v2-self-signup-direction.md), [`docs/PRD.md`](../PRD.md)

## 배경

decisions/004 와 PRD §12 에서 V2 코드 전환을 다음 7개 `/work` PR 시리즈로 분할 진행하기로 권장했다:

1. PR-A: 마이그레이션 + auth/user + proxy.ts 가드
2. PR-B: /signup + /onboarding/\*
3. PR-C: /me/\*
4. PR-D: 운영자 대시보드 + /friends sub-tab + 상세 페이지 확장
5. PR-E: 비교 뷰 이상형 양방향 확장
6. PR-F: V1 라우트·코드 폐기
7. PR-G: README 갱신 + 자체 검수

사용자가 PR-A 시작 직전 분할 실익을 재검토하자고 제기:

> "근데 전체를 그냥 하나의 PR로 만들어 버리면 안되나 굳이 PR을 구분할 필요가 있어?"

## 결정

V2 전환을 **단일 PR (`feature/v2-self-signup-full`)** 로 통합 진행한다. 위 7개 분할은 폐기하지 않고 **PR 내부 task 시퀀스**로 의미만 재정의한다.

작업 순서는 그대로 — Lead 가 task 단위로 worker 에 위임하고 각 task 가 별개 commit 으로 들어가서 commit-by-commit 리뷰가 가능하게 한다. 머지 시점에는 V1 → V2 가 원자적으로 전환된다.

## 근거

### 분할 PR 의 실익이 약하다

7개 분할이 가치를 가지려면 각 머지 시점이 **deploy 가능한 일관 상태**여야 한다. V1 → V2 는 단절적 전환이라 이게 성립하지 않는다:

- PR-A 만 머지: DB 스키마는 V2 인데 코드는 V1 (`lib/db/invitations.ts` 가 `invitation_id` 참조, `/r/[token]` 라우트가 폐기된 테이블 참조 등) → **빌드/런타임 깨짐**
- PR-B 만 추가: `/signup` 진입 가능하지만 `/me/*` 없어 가입 후 갈 곳 없음
- PR-C 만 추가: `/me/*` 있지만 운영자 측 `/friends/[id]` 가 V1 필드 가정이라 가입자 row 표시 깨짐
- ...

머지된 PR 사이가 일관되지 않은 일직선 의존성 → 분할의 핵심 가치인 점진 배포·부분 롤백이 작동 안 함.

### 토이 단계 + 운영자 1명 컨텍스트

- 트래픽·운영 데이터 거의 없음 — 점진 배포 의무 없음
- 운영자 1명 = 리뷰어 1명 — 분할 리뷰의 부담 분산 의미 약함
- V1 가입자 사실상 0 — drop-and-recreate 식 마이그레이션이 깔끔

### 일관성 이득

단일 PR 머지 시점에 다음이 한 번에 정합 상태로 떨어진다:
- 코드 (`app/**`, `lib/**`, `supabase/migrations/**`)
- PRD (`docs/PRD.md`)
- CLAUDE.md 사실 영역 (§4 디렉토리 / §6 데이터 모델 / §7 사이트맵 / §11 환경 변수)
- README

분할 진행하면 머지 사이마다 위 4개가 부분적으로 어긋난 상태가 잠깐씩 누적된다.

### 리뷰 가능성 보존

PR 크기 우려는 commit-by-commit 리뷰로 완화:
- Lead 가 task 단위로 worker 에 위임
- 각 task = 1 commit (마이그레이션 / 라우팅 가드 / 가입 흐름 / 자기 페이지 / 운영자 측 / 비교 뷰 / 폐기·README)
- 리뷰어는 PR diff 통째가 아니라 commit 순서대로 따라가며 리뷰 가능

## 거절된 대안

### A. 7개 분할 그대로 유지 (decisions/004 + PRD §12 권장안)

- 위 "분할 PR 의 실익이 약하다" 사유로 채택 안 함
- 토이 단계 컨텍스트에서 ceremony 비용 > 점진 배포 가치

### B. 두 단계 분할 (인프라 + UX)

- PR1: V2 인프라 + V1 호환 유지 (스키마 신·구 공존, 라우트 둘 다 운영)
- PR2: V1 폐기 + V2 UX 완성

장점: 단계별 deploy 가능, 안전망. 단점:
- V1·V2 호환층 코드 작성 비용 (operator-facing 라우트 두 벌 / 스키마 dual-write 등)
- 토이 단계라 안전망의 가치가 적음
- 결국 PR2 머지 시점에 단일 PR 과 같은 정합 부담
- 채택 안 함

### C. PR-A 만 분리 + 나머지 한 번에

- 마이그레이션을 먼저 머지해두면 코드 작업 중 스키마 충돌 없음
- 하지만 PR-A 머지 후 stage 에 빌드 깨진 코드가 잠깐 들어감 → CI red
- 채택 안 함

## 후속 영향

### PRD §12 갱신

"7개 PR 시리즈" → "단일 PR + 내부 task 시퀀스 7단계" 로 표현 갱신. task 시퀀스는 그대로 보존.

### 작업 시 적용

- `/work` 브랜치명: `feature/v2-self-signup-full`
- 워크트리: `.worktrees/feature-v2-self-signup-full`
- Lead 가 task 단위 분할하고 worker 가 각 task 별 commit
- TDD 게이트는 task 별로 진행 (test-writer 가 task 단위 spec → worker 가 통과)
- peer 검증 (lint·sfx) 은 PR 통째 단위로 마지막에 한 번

### CLAUDE.md / AGENTS.md

정책 변경 없음 — 분할/통합은 작업 단위 결정이지 운영 규약 변경이 아님. CLAUDE.md / AGENTS.md 갱신 X.

### V2.x 확장 시

V2 머지 이후의 V2.x 변경(가입자 탈퇴, 카카오 OAuth 등)은 각각 독립 기능이므로 정상 분할 PR 적용. 이 결정은 V1 → V2 단절 전환에만 한정.
