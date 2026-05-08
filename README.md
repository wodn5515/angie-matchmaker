# matchmaker

> 운영자 한 명을 위한 사적인 중매(매칭) CRM. 친구들의 프로필을 데이터로 정리하고, 1회용 링크로 자가진단 설문을 받고, 비교 뷰로 잘 어울릴 두 사람을 찾는 모바일 웹.

## ✨ 핵심 기능

- **운영자 1명**, 친구 N명 (친구는 계정 없음)
- **챕터식 게이미피케이션 설문** + 자동저장 (객관식 즉시 / 주관식 1.5초 debounce)
- **1:1 비교 뷰** with 같음/다름 색상 하이라이트
- **Pair 엔티티**로 비교 메모 + 소개 이력 통합 관리
- **Black + Pink** 다크 테마, 모바일 반응형

자세한 사양은 [`docs/PRD.md`](./docs/PRD.md), 설계 결정은 [`docs/decisions/`](./docs/decisions/) 참고.

## 🛠 기술 스택

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 (커스텀 디자인 토큰) |
| DB + Auth | Supabase (Postgres + Google OAuth + 이메일 whitelist) |
| Hosting | Vercel (free tier) |

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
| `OPERATOR_DISPLAY_NAME` | 친구 인사말에 들어갈 운영자 이름 (운영자 모두 공유) |
| `NEXT_PUBLIC_APP_URL` | 토큰 링크 만들 때 쓰는 base URL (개발: `http://localhost:3000`) |

> 레거시 키(`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)도 fallback으로 동작합니다. 신규 프로젝트는 publishable/secret 권장.

### 3. Supabase 프로젝트 준비

자세한 단계는 [`docs/deployment.md`](./docs/deployment.md). 요약:

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. SQL Editor 에서 [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) 실행
3. Authentication → Providers → Google 활성화 (OAuth Client ID/Secret 입력)
4. Authentication → URL Configuration 에 redirect URL 등록
5. 프로젝트 키 3개를 `.env.local` 에 복사

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000/login` 에서 등록된 Gmail로 로그인.

## 📂 프로젝트 구조

```
app/
├── (operator)/             인증 필요 라우트 그룹
│   ├── page.tsx            대시보드 (관제실)
│   ├── friends/            친구 CRUD
│   ├── compare/            비교 뷰
│   ├── surveys/            표준/커스텀 설문 편집
│   ├── send/               설문 발송 (토큰 발급)
│   ├── matches/            매칭 이력
│   └── settings/
├── login/
├── auth/{callback,signout}/
└── s/[token]/              친구 측 설문 (인증 없음)

components/
├── ui/                     Button, Card, Input, Badge, Empty
└── operator/               Nav, FriendForm, SurveyEditor

lib/
├── supabase/{server,client,proxy}.ts
├── auth/operator.ts        화이트리스트 검증
├── db/{friends,surveys,invitations,pairs}.ts
├── types/domain.ts
└── utils.ts

supabase/migrations/0001_init.sql

docs/
├── PRD.md
├── decisions/
├── deployment.md
└── review-and-improvements.md
```

## 🧪 검증

```bash
npx tsc --noEmit       # 타입체크
npx eslint .           # 린트
npx next build         # 프로덕션 빌드
```

## 🤝 운영 흐름

1. **운영자**: `/friends/new` → 친구 등록 (이름/성별/선호성별만 필수)
2. **운영자**: `/surveys/standard` → 챕터·문항 만들기
3. **운영자**: `/send` → 친구 + 설문 선택 → 1회용 링크 생성 → 카톡으로 복사
4. **친구**: 링크 클릭 → 챕터 단위로 설문 응답 → 자동 저장 → 제출
5. **운영자**: 대시보드에서 새 응답 확인 → 후보 두 명 골라 `/compare?a=…&b=…` → 같음/다름 색상으로 빠르게 검토 → 메모 작성 → "💞 소개 기록"
6. **운영자**: 결과(잘됨/별로/진행중) 업데이트 → `/matches` 에서 이력 추적

## 📜 V1 범위

[`docs/PRD.md`](./docs/PRD.md) §3, §9 참고. 점수 기반 자동 매칭, LLM 분석, 다중 운영자, CSV 내보내기, 푸시 알림 등은 V1 범위 밖.
