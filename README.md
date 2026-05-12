# matchmaker

> 운영자(개인)가 검토자 역할만 맡는 모바일 웹 소개팅 서비스. 가입자는 Google 로 자가 가입해 본인 정보를 직접 채우고, 운영자는 비교 뷰에서 두 명을 살펴 매칭을 결정한 뒤 카톡 등 외부 채널로 양쪽을 연결한다.

## ✨ 핵심 기능

- **자가 가입 (Google OAuth)** — `/signup` 진입 → OAuth → 신규 가입자면 `/onboarding/profile` 로 라우팅
- **3 step 온보딩** — Step 1 (필수: 이름·성별·성취향·추천인) → Step 2 (이상형, 선택) → Step 3 (연애 성향 테스트, 선택)
- **운영자 심사** — 추천인 + 가입자 정보 + 이상형 + 설문 응답을 본 뒤 [✓ 승인] / [✗ 거절 + 비공개 메모]
- **자기 페이지** — 가입자는 `/me` 에서 본인 프로필 / 이상형 / 설문 응답을 언제든 수정
- **1:1 비교 뷰** — 메타데이터 비교 + **이상형 양방향 매칭** (A→B / B→A, 같음/일부/다름/중립 색상 단서) + 표준 설문 비교
- **Pair 노트장** — 비교 메모 + 매칭 회고 (`introduced`, `outcome`, `outcome_memo`) 운영자 본인 회고용
- **Black + Pink 다크 톤** — 운영자 측은 Linear / Vercel admin 결, 가입자 측은 부드러운 그라데이션 + 게이미피케이션

자세한 사양은 [`docs/PRD.md`](./docs/PRD.md), 설계 결정은 [`docs/decisions/`](./docs/decisions/) (`000`~`006`) 참고.

## 🛠 기술 스택

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 (`@theme` 디자인 토큰) + 자체 UI 프리미티브 (`components/ui/*`) |
| DB + Auth | Supabase (Postgres + Google OAuth + `OPERATOR_EMAIL` 화이트리스트) |
| 단위/통합 테스트 | Vitest + React Testing Library |
| E2E 테스트 | Playwright |
| Hosting | Vercel (Hobby) |

비용 ≈ **$0/년** (Supabase free + Vercel hobby + vercel.app 서브도메인).

## 🚀 빠른 시작 (로컬)

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 을 복사:

```bash
cp .env.example .env.local
```

채워야 할 값:

| Var | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`). 브라우저 노출 OK |
| `SUPABASE_SECRET_KEY` | Supabase secret key (`sb_secret_…`). **서버 전용, 절대 NEXT_PUBLIC_ 금지** |
| `OPERATOR_EMAIL` | 운영자 Gmail. **콤마로 구분해 여러 개 등록 가능**. 모두 같은 데이터를 공유 |
| `OPERATOR_DISPLAY_NAME` | 운영자 표시 이름 |
| `NEXT_PUBLIC_APP_URL` | OAuth callback base URL (개발: `http://localhost:3000`) |

> 레거시 키(`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)도 fallback으로 동작.

### 3. Supabase 프로젝트 준비

자세한 단계는 [`docs/deployment.md`](./docs/deployment.md). 요약:

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. SQL Editor 에서 마이그레이션 순서대로 실행
   - [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) (V1 기반 스키마)
   - [`supabase/migrations/0002_friend_invitations.sql`](./supabase/migrations/0002_friend_invitations.sql) (V1 토큰 흐름 — V2 가 곧 폐기)
   - [`supabase/migrations/0003_v2_self_signup.sql`](./supabase/migrations/0003_v2_self_signup.sql) (V2 자가 가입 전환 — friends 확장 + friend_ideals + 1:N 5 + survey_answers 키 변경 + V1 invitation 폐기)
3. Authentication → Providers → Google 활성화 (OAuth Client ID/Secret 입력)
4. Authentication → URL Configuration 에 redirect URL 등록 (`https://<your-app>.vercel.app/auth/callback`)
5. 프로젝트 키 3개를 `.env.local` 에 복사

### 4. 개발 서버 실행

```bash
npm run dev
```

- 운영자: `/login` 에서 화이트리스트 Gmail 로 로그인 → `/` (관제실)
- 가입자: `/signup` 에서 Google OAuth → 신규면 `/onboarding/profile`, 기존 승인 가입자면 `/me`

## 📂 프로젝트 구조

```
app/
├── (operator)/              운영자 라우트 그룹 (OPERATOR_EMAIL 화이트리스트 필수)
│   ├── page.tsx             대시보드 (심사 대기 / 가입자 현황 / 빠른 진입)
│   ├── friends/             가입자 리스트 (sub-tab: 전체 / 심사 대기 / 승인 / 거절)
│   │   └── [id]/            가입자 상세 (기본 + 이상형 + 설문 응답 + ReviewActions)
│   ├── compare/             1:1 비교 뷰 (이상형 양방향 매칭 포함)
│   ├── surveys/             표준 / 커스텀 설문 편집
│   └── settings/
├── signup/                  Google OAuth 시작
├── onboarding/{profile,preferences,survey}/   3-step 온보딩
├── me/                      가입자 자기 페이지
│   ├── {profile,preferences}/
│   └── survey/[chapter]/    챕터 runner (자동 저장)
├── pending/                 심사 대기 안내
├── rejected/                가입 거절 안내
├── login/
└── auth/{callback,signout}/

components/
├── ui/                      Button / Card / Input / Badge / Empty / Stepper /
│                            TabBar / MultiSelectChip / RangeSlider / RankingPicker / Field
├── operator/                Nav / FriendForm / SurveyEditor / FriendsStatusTabs /
│                            FriendIdealSection / IdealMatchRow / ReviewActions /
│                            DashboardWidgets / SurveysTabs / AnswerView
└── user/                    UserShell / OnboardingStepHeader / MeSectionCard / StatusBanner

lib/
├── supabase/{server,client,proxy}.ts
├── auth/{operator,user,guard,onboarding}.ts
├── db/{friends,ideals,answers,surveys,pairs}.ts
├── types/{domain,v2-options}.ts
├── validation/profile.ts
└── utils.ts

supabase/migrations/
├── 0001_init.sql
├── 0002_friend_invitations.sql   (V1 — V2 에서 DROP)
└── 0003_v2_self_signup.sql       (V2 전환)

tests/
├── unit/                    Vitest + RTL (proxy guard / auth-user / compare-ideal)
└── integration/             Vitest (migration SQL 정합 / onboarding-resume /
                             survey-answers-upsert)

e2e/
└── tests/                   Playwright (signup-onboarding / operator-review)
```

## 🧪 검증

```bash
npx tsc --noEmit       # 타입체크
npm run lint           # 린트
npm test               # 단위 + 통합 (Vitest)
npm run test:e2e       # E2E (Playwright)
npx next build         # 프로덕션 빌드
```

## 🤝 운영 흐름

1. **가입자**: `/signup` → Google 로그인 → `/onboarding/profile` (이름·성별·성취향·추천인) → preferences/survey (skip 가능) → `/pending`
2. **운영자**: `/` 대시보드에서 ⏳ 심사 대기 위젯 → 가입자 상세 (`/friends/[id]`) → [✓ 승인] / [✗ 거절 + 비공개 메모]
3. **가입자**: 승인되면 `/me` 진입 가능. 본인 프로필 / 이상형 / 설문 응답 수정 가능
4. **운영자**: 두 가입자 후보를 `/compare?a=&b=` 로 → 메타데이터 비교 + 이상형 양방향 매칭 색상 단서 + 표준 설문 비교 → Pair 메모 작성 → [💘 큐피드 발동]
5. **운영자**: 카톡 등 외부 채널로 양쪽 인스타 ID 공유 → 진행 결과를 사이트의 Pair `outcome_memo` 에 회고

> 사이트는 매칭 진행 상태를 자동 추적하지 않는다. Pair 는 운영자 본인 회고 노트장이며, 사용자에게 자동 알림이 가지 않는다 (PRD §3.4.1 / §6.6).

## 📜 V2 범위

자동 매칭/LLM 분석, 자동 알림 인프라(이메일/SMS/푸시), 사이트 내 매칭 워크플로우, CSV 내보내기, 다국어, 다중 운영자 SaaS, 가입자 탈퇴/신고/차단은 V2 범위 밖 (PRD §1.3 / §9). 대부분 V2.x / V3 검토 후보.
