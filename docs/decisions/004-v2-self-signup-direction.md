# 004-v2-self-signup-direction: V2 자가 가입 모델 전환

> 작성: 2026-05-12  /  작성자: Lead 에이전트
> 관련 작업: `meta/v2-prd-update` 브랜치
> 관련 자료: [`docs/operator-feedback/2026-05-12-direction-change.md`](../operator-feedback/2026-05-12-direction-change.md), [`docs/PRD.md`](../PRD.md)

## 배경

V1 (PRD `000-initial-decisions.md` ~ `003`) 의 사용자 모델은 다음과 같았다:

- 운영자 1명이 자신의 지인(Friend)을 한 명씩 직접 등록
- 친구는 계정 없이 운영자가 발급한 1회용 토큰 링크(`/r/[token]`, `/s/[token]`)로만 접근
- 매칭 결정은 운영자가 비교 뷰에서 수동

운영자(김안지)가 2026-05-12 카톡 (전문은 `docs/operator-feedback/2026-05-12-direction-change.md`) 에서 이 모델이 본인 의도와 다르다고 명시:

> "지금은 마치 제 친구관리 서비스 같거든요. 제가 원하는 건 사용자들이 자기 프로필 알아서 제출하고 저는 보고 매칭하는 거예요."

핵심 차이:
- 운영자가 친구를 일일이 등록·관리하는 부담을 거부 ("등록 관리는 사용자가")
- "친구의 친구" 까지 매칭 망을 확장하려면 운영자가 모르는 사람도 가입자가 되어야 함
- 다만 안전을 위해 추천인 입력은 필수 ("진짜 친구의 친구만")

V1 의 `/r/[token]` 자가 등록 흐름(PR #5) 은 이 새 모델의 부분집합이지만, 토큰 발급 주체가 운영자였다는 점이 본질적으로 다르다 — 새 모델에선 가입 자체가 공개되어야 함.

## 결정

V2 로 다음과 같이 전환한다:

1. **공개 가입 모델 도입** — `/signup` 페이지에서 누구나 Google OAuth 로 자가 등록
2. **운영자 역할 = 매칭 검토자 only** — 가입 검토(추천인 검증) + 비교 뷰에서 매칭 결정. 친구 직접 등록 흐름 폐기
3. **추천인 필수** — 가입 시 "운영자가 아는 사람" 이름 + 어떻게 아는지 1줄 입력, 운영자 수동 검토(pending → approved/rejected)
4. **데이터 모델 V2** — `friends` 확장 + `friend_ideals` + 다중선택 1:N 분리 + `survey_answers` 키 변경 + `survey_invitations`·`friend_invitations` 폐기

상세 사양은 갱신된 [`docs/PRD.md`](../PRD.md) 참조.

## 근거

### 운영자 톤 일관성

V1 인터뷰(000) 에서 운영자가 "매칭 검토자" 결을 일관되게 표현했음에도, V1 구현은 운영자가 친구 데이터를 직접 채우는 CRM 결로 흘렀다. V2 의 자가 가입 모델은:
- 운영자가 "검토만" 하면 되는 흐름 → 운영자 본인 의도와 정확히 일치
- 가입자가 본인 정보를 직접 입력 → 데이터 정확성·풍부함 향상 (운영자 추측 제거)

### 기존 V1 코드 자산 보존

V2 가 V1 의 많은 코드를 폐기하지만 다음은 살아남는다:
- 비교 뷰 (`/compare?a=&b=`) — Pair 엔티티 그대로
- 표준 설문 시스템 (`/surveys/standard`, `survey_questions/chapters/answers`) — 토큰 진입만 OAuth 진입으로 변경
- 친구 카드 뷰 (`/friends`, `/friends/[id]`) — sub-tab 과 신규 필드만 추가
- `pairs` 테이블 — 운영자의 매칭 회고 노트장으로 그대로

즉 V2 는 V1 의 "친구 등록" 흐름만 뒤집고 "매칭 도구" 는 보존하는 정정.

### 비용·복잡도 보존

V2 도입에도 V1 의 "비용 ~$0" 원칙은 유지:
- Supabase Free + Vercel Hobby 그대로
- Google OAuth 이미 활성 (운영자용에서 가입자용으로 확장만)
- 자동 알림 인프라(이메일·SMS·푸시) 도입 X — 운영자가 외부 카톡으로 진행

## 거절된 대안

### A. 풀 분리 (운영자 등록 친구 / 자가 가입자 별도)
- 매칭 풀이 분리되면 "친구의 친구" 망 확장 의미가 약해짐 → 운영자 의도와 충돌
- 채택 안 함

### B. 토큰 발급 흐름 유지 (운영자가 1:1 발급도 가능)
- 운영자가 친구 한 명씩 챙기던 부담 결이 그대로 살아남음
- 가입자 측 흐름이 두 갈래로 분기 → 코드 복잡도 증가
- 채택 안 함

### C. 추천인 자동 검증 (운영자 등록 친구 이름과 매칭)
- 운영자가 모든 친구를 사전 등록해야 추천인으로 인정 가능 → 운영자 부담 결 회복
- V1 토이 트래픽 가정에선 수동 검토로 충분
- V2.x 검토 항목으로 mark

### D. 자동 알림 (이메일 / 카카오 알림톡 / 푸시)
- 이메일: Supabase 무료 한도 가능하지만 V1 PRD non-goal 위반
- 카카오 알림톡: 비즈 채널 등록 + 월 비용 → V1 토이 스코프 외
- 푸시: PWA Web Push 한국 사용자 friction 큼
- → 운영자가 외부 카톡으로 진행하는 흐름 유지

### E. 사이트 내 가입자 액션 (수락/거절 UI)
- 가입자가 사이트에서 매칭 수락/거절 → 운영자 입력 자동화
- 운영자 의도("외부에서 알아서 control") 와 충돌. 가입자도 매번 사이트 방문해야 함
- 사이트는 데이터 등록·표시만, 매칭 진행은 100% 외부 카톡으로 결정
- 채택 안 함

### F. 데이터 모델: friends 에 이상형 컬럼 통합 (17개 컬럼 추가)
- 정규화 약함, 다중선택 `text[]` 검색·제약 약함
- → `friend_ideals` 1:1 + 다중선택 1:N 분리로 정규화

### G. PRD 의 V1 컨셉 보존 + V2 별도 문서
- V1 문서가 폐기된 결정을 명시하면 코드와 PRD 간 거짓이 누적됨
- V2 가 V1 의 사용자 모델을 통째로 뒤집어 사실상 같은 문서에 공존 불가능
- `docs/PRD.md` 를 V2 로 갱신, V1 결정 로그(000~003)는 시간순 기록으로 보존

## 후속 영향

### 코드 변경 범위 (별도 `/work` PR 시리즈로 분할 진행)

1. **DB 마이그레이션** `0003_v2_self_signup.sql` — friends 확장 + friend_ideals + 1:N 테이블 + survey_answers 키 변경 + survey_invitations/friend_invitations 폐기
2. **인증·라우팅** — `proxy.ts` 가드 재설계 (OAuth + status 분기), `lib/auth/operator.ts` + 신규 `lib/auth/user.ts` 분리
3. **가입자 측 라우트 신설** — `/signup`, `/onboarding/{profile,preferences,survey}`, `/me`, `/me/{profile,preferences,survey}`, `/pending`, `/rejected`
4. **운영자 측 정리** — `/friends/new`, `/friends/invites` 폐기 / `/friends` sub-tab 추가 / `/surveys` `/matches` 를 nav 에서 제외 / 대시보드 위젯 3개 재구성
5. **가입자 상세 페이지 확장** — `/friends/[id]` 에 이상형·설문응답·심사액션·Pair 메모 섹션 추가
6. **비교 뷰 확장** — `/compare` 에 이상형 매칭 양방향 시각화 (양쪽 ideal ↔ 상대 프로필 색상 단서)
7. **친구 측 코드 폐기** — `/r/[token]`, `/s/[token]`, `lib/db/friend-invitations.ts`, `lib/db/invitations.ts` 토큰 흐름

### V2.x 검토 항목 (지금 결정 안 함, PRD §9-에 명시)

- 가입자 탈퇴 / soft delete 도입
- 추천인 자동 검증 (트래픽 증가 시 도입)
- 부적절 가입자 신고·차단
- 카카오 OAuth (Gmail 외 사용자 풀 확장)
- Pair 거절 후 cooldown / 재매칭 차단

### 인터뷰어 자율 채택

- **거절 사유 비공개 default** — `friends.rejected_reason` 은 운영자 비공개. `/rejected` 페이지에는 일반 안내만 노출
- **`pairs` 엔티티 의미 재정의** — 매칭 상태 자동 추적 시스템 X. 운영자가 매칭을 카톡 외부에서 진행한 뒤 자유 메모로 회고하는 노트장. 사이트는 "현재 진행 중 매칭" 같은 상태 표시 X
