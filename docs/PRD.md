# Matchmaker — Product Requirements Document

> A personal matchmaking CRM. Operator(=비개발자 지인)가 본인의 지인들을 데이터센터화 하여 정리하고, 친구들에게 자가진단 설문을 보내서 응답을 모으고, 비교 뷰로 매칭을 결정하는 모바일 웹 서비스.

---

## 1. Product Overview

### 1.1 Concept

운영자(Operator)가 자신의 지인(Friend)들에 대한 정보를 CRM처럼 관리하고, 잘 어울릴 것 같은 두 사람을 매칭(중매)하는 데 사용하는 개인 도구. 친구는 운영자가 보낸 1회용 링크를 통해 자기 자신에 대한 설문에 응답한다.

### 1.2 Core Value Proposition

- 운영자가 머릿속에서만 굴리던 인맥/매칭 가능성을 구조화된 데이터로 저장
- 친구들의 설문 응답을 수집해서 운영자의 주관과 객관 데이터를 함께 보고 매칭 결정
- 비교 뷰에서 두 친구의 답변을 한눈에 시각적으로 비교

### 1.3 Non-Goals

- 자동 매칭 추천 알고리즘 (LLM 사용 X, 점수화 X) — 토이 스코프 외
- 친구 본인의 계정/회원가입 — 토큰 기반으로 충분
- 다중 운영자 / SaaS — 1인 운영자 한정 (확장은 추후)
- 푸시/이메일/SMS 알림 — 인앱 확인만
- 데이터 백업/내보내기 (CSV) — 토이 스코프 외

---

## 2. User Roles

### 2.1 Operator (단일 운영자)
- chrisjohn의 지인. 비개발자.
- Google OAuth로 로그인 (whitelist 단일 이메일)
- 모든 데이터(친구 프로필, 설문, 매칭) 접근/수정
- 1명 한정 (본 PRD 범위)

### 2.2 Friend (=Subject, 계정 없음)
- 운영자가 등록한 인물
- 운영자가 생성한 1회용 링크(`/s/[token]`)로만 접근
- 본인의 표준/커스텀 설문에 응답
- 응답 외 다른 페이지/데이터 접근 불가

### 2.3 Developer (chrisjohn)
- 코드 수정 및 배포 담당
- 환경변수(운영자 화이트리스트 이메일, Supabase 키 등) 설정
- 운영자가 UI에서 못 하는 모든 일

---

## 3. Feature List

### 3.1 운영자 인증
- Google OAuth (Supabase Auth)
- 환경변수의 단일 이메일과 일치할 때만 진입 허용
- 다른 Gmail은 로그인 직후 차단/로그아웃

### 3.2 대시보드 (메인 화면)
- 응답 대기 중 설문 수
- 새 응답 도착 수
- 친구 총 수 / 평균 프로필 완성도
- 최근 매칭(소개) 이력 N건
- 빠른 진입 카드: 친구 등록, 설문 발송, 비교 뷰

### 3.3 친구(Friend) 관리
- 리스트: 검색 / 필터 (성별, 연애상태, 매칭 관심도, 태그)
- 상세 카드: Tier 1~4 정보 표시, 프로필 완성도 표시
- 등록: Tier 1 필수(이름, 성별, 선호 성별), Tier 2는 펼쳐서 입력
- 수정: 모든 필드 자유 수정
- 삭제: 확인 모달 후 삭제 (관련 응답/Pair 동작은 #6.5 참조)

### 3.4 설문(Survey) 관리
- 표준 설문 1개: 챕터 단위로 구성, 챕터당 N개 문항
- 커스텀 설문: 운영자가 친구별 1회성 추가 설문 작성
- 문항 타입:
  - 객관식 단일선택 / 다중선택
  - Likert 척도 (1~5 또는 1~7)
  - 우선순위 (랭킹)
  - 주관식 (커스텀 설문에서만)
- 표준 설문 편집: 챕터 추가/삭제, 문항 추가/수정/삭제, 순서 변경

### 3.5 설문 발송
- 친구 선택 → 설문(표준 or 커스텀) 선택 → 1회용 토큰 발급 → 링크 표시
- 링크 복사 버튼 / 카톡 공유 시트 (Web Share API)
- 발송 상태: pending(미응답) / completed(응답완료) / 발급 시각

### 3.6 비교 뷰 (Compare View)
- 1:1 비교만 지원
- 진입: (A) 친구 리스트에서 한 명 선택 후 다른 한 명 추가, (B) 친구 상세에서 비교 시작
- 표시 요소:
  - 두 사람 기본 정보(Tier 1~3) 나란히
  - 표준 설문 답변 항목별 비교 (Likert/객관식/우선순위 시각화)
  - 자동 하이라이트: 같은 답=초록 / 다른 답=빨강 (점수 계산 X)
  - 두 사람 자유 메모(운영자 작성)
- Pair 메모 작성/수정
- "이 둘 소개했음" 기록 버튼 (introduced=true, introduced_at 기록)
- 결과 업데이트 (잘됨/별로/진행중/모름) 및 결과 메모

### 3.7 매칭 이력 (Match History)
- introduced=true 인 Pair 목록
- 결과별 필터
- 클릭 시 해당 비교 뷰로 진입

### 3.8 친구 측 설문 UX
- `/s/[token]` 접근 시:
  - 토큰 무효 → "이미 답변 완료" 또는 "유효하지 않은 링크" 화면
  - 응답 진행 중 → 이어서 풀기
  - 신규 → 챕터 1부터 시작
- 개인화 인사: "안녕, [친구이름]! [운영자명]이 보낸 설문이야 🎀"
- 챕터별 진행 + 클리어 애니메이션 + 챕터 끝 가벼운 결과 카드
- 자동 저장:
  - 객관식 / Likert / 우선순위 → 선택 즉시 저장
  - 주관식 텍스트 → debounce(1.5초) 저장
  - 화면에 작은 "저장됨 ✓" 표시
- 모든 챕터 완료 시 제출 버튼 → 토큰 만료 처리 → 완료 화면

---

## 4. Data Model (논리적 스키마)

### 4.1 Tables

```
operators (실질 1행)
  id              uuid (Supabase auth.users.id)
  email           text
  display_name    text

friends
  id              uuid
  owner_id        uuid (FK operators.id)
  -- Tier 1
  name            text NOT NULL
  gender          text NOT NULL ('male'|'female'|'other')
  preferred_gender text NOT NULL ('male'|'female'|'any')
  -- Tier 2
  birth_year      int (nullable)
  region          text (nullable)
  occupation      text (nullable)
  closeness       int (1~5, nullable)
  how_we_met      text (nullable)
  tags            text[] (nullable)
  -- Tier 3
  instagram       text (nullable)
  kakao_id        text (nullable)
  phone           text (nullable)
  notes           text (nullable)
  -- Operator-set status (Tier 4 이지만 운영자 입력)
  relationship_status text (nullable)
  match_interest  text (nullable, 'high'|'medium'|'low'|'none')
  
  created_at, updated_at

surveys
  id              uuid
  owner_id        uuid (FK operators.id)
  type            text ('standard' | 'custom')
  title           text
  description     text (nullable)
  is_active       bool (표준 설문은 항상 active)
  created_at, updated_at

survey_chapters
  id              uuid
  survey_id       uuid (FK surveys.id)
  order_index     int
  title           text
  description     text (nullable)
  result_template text (nullable)  -- 챕터 클리어 시 친구에게 보일 가벼운 결과 메시지

survey_questions
  id              uuid
  chapter_id      uuid (FK survey_chapters.id)
  order_index     int
  type            text ('mcq_single' | 'mcq_multi' | 'likert' | 'ranking' | 'text')
  prompt          text
  options         jsonb  -- type별 스키마: 객관식 → ['A','B','C'], Likert → {min:1,max:5,minLabel,maxLabel}, ranking → ['항목1','항목2',...], text → null
  required        bool

survey_invitations  -- 1회용 토큰
  id              uuid
  token           text UNIQUE
  friend_id       uuid (FK friends.id)
  survey_id       uuid (FK surveys.id)
  status          text ('pending' | 'in_progress' | 'completed')
  created_at
  completed_at    timestamp (nullable)

survey_answers
  id              uuid
  invitation_id   uuid (FK survey_invitations.id)
  question_id     uuid (FK survey_questions.id)
  value           jsonb  -- type별: mcq_single → "A", mcq_multi → ["A","B"], likert → 4, ranking → ["항목1","항목3","항목2"], text → "..."
  updated_at

pairs
  id              uuid
  owner_id        uuid (FK operators.id)
  friend_a_id     uuid (FK friends.id)  -- 항상 friend_a_id < friend_b_id (정렬)
  friend_b_id     uuid (FK friends.id)
  comparison_memo text (nullable)
  introduced      bool default false
  introduced_at   timestamp (nullable)
  outcome         text (nullable, 'good' | 'bad' | 'in_progress' | 'unknown')
  outcome_memo    text (nullable)
  created_at, updated_at
  UNIQUE(friend_a_id, friend_b_id)
```

### 4.2 Notes
- `owner_id` 컬럼은 멀티 운영자 확장을 위한 미래 대비 (현재는 단일값)
- Pair는 `friend_a_id < friend_b_id`로 정렬 저장 (중복 방지)
- 토큰은 충분히 긴 random URL-safe (Base64 32자)

---

## 5. Sitemap & Routing

### 5.1 운영자 라우트 (인증 필수)
```
/                       대시보드
/login                  로그인 (Google OAuth)
/friends                친구 리스트
/friends/new            친구 등록
/friends/[id]           친구 상세
/friends/[id]/edit      친구 수정
/compare?a=...&b=...    비교 뷰
/surveys                설문 관리 허브
/surveys/standard       표준 설문 편집
/surveys/custom/new     커스텀 설문 작성
/surveys/custom/[id]    커스텀 설문 상세/수정
/send                   설문 발송 마법사
/matches                매칭 이력
/settings               설정
```

### 5.2 친구 측 라우트 (인증 없음, 토큰 기반)
```
/s/[token]              랜딩 / 인사 / 시작 / 이어풀기 라우팅
/s/[token]/[chapter]    챕터 N
/s/[token]/done         완료 화면
/s/[token]/expired      만료/무효 화면
```

---

## 6. UX Detail

### 6.1 Operator UX 톤
- 미니멀 모던 다크 (Linear/Vercel admin 느낌)
- Black base + Pink accent
- 모바일 우선, 데스크톱에서도 자연스럽게 펼쳐짐
- 핵심 액션은 핑크 CTA, 본문은 무채색

### 6.2 Friend Survey UX 톤
- 챕터 클리어형 + 심리테스트 결과 톤 혼합
- 핑크 비중 ↑, 일러스트적 요소 / 부드러운 트랜지션
- 한 화면 한 질문 또는 챕터 단위로 묶음
- 챕터 클리어 애니메이션 + 가벼운 결과 메시지
- 진행도 바 (전체 챕터 중 N/M)
- 답변 즉시/디바운스 자동 저장 + 작은 "저장됨" 인디케이터

### 6.3 비교 뷰 UX
- 모바일: 2열 카드 위아래 비교 또는 좌우 스와이프
- 데스크톱: 좌우 나란히
- 답변 비교 행: 같음=초록 점, 다름=빨강 점
- Pair 메모 입력란은 페이지 하단 sticky
- "소개 기록" 버튼은 페이지 우측 상단

### 6.4 Profile Completion
- friends 카드/상세에 % 표시
- Tier 1 = 30% / Tier 2 = +40% / Tier 3 = +20% / 표준 설문 응답 = +10%
- 100% 미만 시 빠진 카테고리 안내

### 6.5 Edge Cases
- 친구 삭제 시 → 관련 invitation, answers, pairs(소속된 모든 페어) 모두 ON DELETE CASCADE
- Pair는 friend_a_id < friend_b_id 정렬, 한 쌍당 1행만 존재
- 친구가 같은 토큰으로 동시 접속 → DB가 진실의 원천, 마지막 저장이 우선
- 토큰 만료 후 재진입 → /s/[token]/expired 표시

---

## 7. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (운영자) + 커스텀(친구 측) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (Google OAuth + email whitelist) |
| Hosting | Vercel (Hobby tier, free) |
| Domain | vercel.app subdomain (free) |
| State | React Server Components + Server Actions, 클라이언트는 useState 위주 |
| Forms | React Hook Form + Zod (validation) |

### 7.1 Project Structure
```
/
├── app/
│   ├── (operator)/           # 인증 필요 그룹
│   │   ├── layout.tsx        # 헤더/사이드바
│   │   ├── page.tsx          # 대시보드
│   │   ├── friends/
│   │   ├── compare/
│   │   ├── surveys/
│   │   ├── send/
│   │   ├── matches/
│   │   └── settings/
│   ├── login/
│   ├── auth/callback/        # Supabase OAuth callback
│   ├── s/[token]/            # 친구 측 설문
│   └── api/                  # 필요시 API routes
├── components/
│   ├── ui/                   # shadcn/ui
│   ├── operator/             # 운영자 전용
│   └── survey/               # 친구 측 설문 컴포넌트
├── lib/
│   ├── supabase/             # 서버/클라이언트 인스턴스
│   ├── auth/                 # 권한 체크
│   ├── db/                   # 쿼리 헬퍼
│   └── types/                # 도메인 타입
├── supabase/
│   └── migrations/           # SQL 마이그레이션
├── docs/                     # PRD, 결정 로그
└── public/
```

---

## 8. Environment Variables

| Name | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용, 친구 측 설문 응답 저장에 사용 |
| `OPERATOR_EMAIL` | 화이트리스트 단일 이메일 |
| `OPERATOR_DISPLAY_NAME` | 친구 인사말에 들어가는 운영자 이름 |
| `NEXT_PUBLIC_APP_URL` | 토큰 링크 생성 시 사용 (예: https://...vercel.app) |

---

## 9. Out of Scope (V1)

- 점수 기반 자동 매칭 추천
- LLM 정성 분석
- 다중 운영자
- 데이터 CSV 내보내기
- 푸시/이메일/SMS 알림
- 다국어 (한국어 단일)
- 친구 본인 계정/로그인
- 친구가 결과를 외부 공유하는 기능

---

## 10. Success Criteria

- 운영자가 모바일 브라우저에서 Google 로그인 → 대시보드 진입까지 5초 이내
- 친구 등록 폼: Tier 1 필수 3개로 30초 이내 등록 가능
- 친구가 카톡으로 받은 링크 → 설문 첫 화면까지 3초 이내
- 친구가 설문 중 페이지 이탈 후 재진입 → 답변 손실 없음
- 비교 뷰에서 두 친구 답변 차이를 색상으로 즉시 인식 가능
- 모든 화면이 모바일 360px 폭에서 깨지지 않음

---

## 11. Definition of Done (V1)

- [ ] 모든 §3 기능 구현
- [ ] 모든 §5 라우트 동작
- [ ] §4 스키마로 마이그레이션 적용 가능
- [ ] §6 UX 디테일 구현
- [ ] 운영자 화이트리스트 인증 동작
- [ ] 토큰 1회용 / 미완료 재진입 / 자동 저장 동작
- [ ] 모바일 반응형 검증
- [ ] README + 배포 가이드 작성
- [ ] PRD vs 코드 검증 보고서 작성 (`docs/review-and-improvements.md`)
