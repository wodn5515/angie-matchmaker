# Deployment Guide

> Supabase 프로젝트 생성 → Google OAuth 설정 → Vercel 배포 절차. 처음부터 끝까지 따라가면 30분 안에 운영 가능.

## 0. 사전 요구사항

- GitHub 계정
- Supabase 계정 ([supabase.com](https://supabase.com))
- Vercel 계정 ([vercel.com](https://vercel.com))
- Google Cloud Console 접근 권한 ([console.cloud.google.com](https://console.cloud.google.com))
- 운영자(서비스를 실제 쓸 사람)의 Gmail 주소

---

## 1. Supabase 프로젝트 생성

### 1.1 새 프로젝트 만들기

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. 이름: `matchmaker` (자유)
3. Region: `Northeast Asia (Seoul)` 권장
4. Database password: 강한 패스워드 (잃어버리지 말기)
5. **Create new project** → 약 2분 대기

### 1.2 스키마 적용

1. 좌측 메뉴 → **SQL Editor** → **New query**
2. 이 레포의 [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) 전체 내용 붙여넣기
3. **Run** 실행 → "Success. No rows returned" 메시지 확인

### 1.3 키 / URL 복사

새 대시보드(2025년 개편)에서 **Project URL** 과 **API Keys** 가 다른 페이지에 있습니다:

| 값 | 위치 | env 매핑 |
|---|---|---|
| **Project URL** (`https://xxx.supabase.co`) | Project Settings → **Data API** → "Project URL" | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…`) | Project Settings → **API Keys** → API Keys 탭 | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (브라우저 노출 OK) |
| **Secret key** (`sb_secret_…`) | Project Settings → **API Keys** → API Keys 탭 | `SUPABASE_SECRET_KEY` (⚠️ **서버 전용**) |

**더 빠른 방법**: 대시보드 상단 우측 **`</> Connect`** 버튼 클릭 → App Frameworks → **Next.js** 선택 → URL + publishable key가 `.env` 포맷으로 한 번에 복사 가능. (단, secret key는 별도로 API Keys 페이지에서 복사 필요.)

> 신규 publishable/secret 키 체계는 2025년 7월부터 도입된 표준입니다. 레거시 `anon` / `service_role` 키도 코드에서 fallback으로 동작하지만, 새 프로젝트는 publishable/secret로 시작하세요. API Keys 페이지의 **Legacy API Keys** 탭에서 옛 키도 볼 수 있습니다.

---

## 2. Google OAuth 설정

### 2.1 Google Cloud Console에서 OAuth Client 만들기

1. [console.cloud.google.com](https://console.cloud.google.com) → 프로젝트 생성 또는 선택
2. **APIs & Services** → **OAuth consent screen**:
   - User type: **External** 선택
   - App name: `matchmaker`
   - User support email: 운영자 이메일
   - Developer contact: 본인 이메일
   - Scopes: `email`, `profile`, `openid` 추가
   - Test users: 운영자 Gmail 추가 (앱이 publishing되지 않은 동안 필요)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `matchmaker-supabase`
   - **Authorized redirect URIs** 에 다음 추가:
     ```
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     `YOUR_SUPABASE_PROJECT_REF` 는 Supabase의 Project URL 에서 추출 (`https://abcd1234.supabase.co` → `abcd1234`)
4. 생성 후 **Client ID**와 **Client Secret** 복사

### 2.2 Supabase에 Google Provider 등록

1. Supabase 대시보드 → **Authentication** → **Providers**
2. **Google** 토글 켜기
3. 위에서 받은 **Client ID** / **Client Secret** 붙여넣기
4. **Save**

### 2.3 (선택) Site URL 설정

Supabase → **Authentication** → **URL Configuration**:
- Site URL: 일단 `http://localhost:3000` (배포 후 갱신)
- Additional Redirect URLs 에:
  - `http://localhost:3000/auth/callback`
  - 배포 후 `https://YOUR_DOMAIN.vercel.app/auth/callback`

---

## 3. 로컬에서 동작 확인

### 3.1 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`을 채우기:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # 1.3 publishable key
SUPABASE_SECRET_KEY=sb_secret_...                          # 1.3 secret key (서버 전용)
OPERATOR_EMAIL=operator@gmail.com                          # 실제 운영자 Gmail
OPERATOR_DISPLAY_NAME=민수                                  # 친구한테 인사할 때 보일 이름
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.2 실행

```bash
npm install
npm run dev
```

`http://localhost:3000/login` → "Google 계정으로 로그인" → 운영자 Gmail로 진입.

다른 Gmail로 로그인을 시도하면 즉시 차단되어 로그인 페이지로 리디렉트되는지 확인.

---

## 4. Vercel 배포

### 4.1 GitHub에 푸시

```bash
git add .
git commit -m "Initial implementation"
# (이미 git init 되어 있다면 remote 추가 후 push)
git remote add origin git@github.com:YOUR_NAME/matchmaker.git
git branch -M main
git push -u origin main
```

### 4.2 Vercel에 import

1. [vercel.com/new](https://vercel.com/new) → GitHub 레포 선택
2. **Framework Preset**: Next.js (자동 감지)
3. **Environment Variables** 섹션에 `.env.local`의 값들 모두 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `OPERATOR_EMAIL`
   - `OPERATOR_DISPLAY_NAME`
   - `NEXT_PUBLIC_APP_URL` → 배포 후 도메인 (예: `https://matchmaker-xyz.vercel.app`)

   > 도메인 모를 때는 일단 빈 값으로 두고 첫 배포 후 `Settings → Environment Variables` 에서 갱신 → Redeploy.

4. **Deploy**

### 4.3 배포 후 추가 설정

1. 발급된 도메인 (예: `matchmaker-xyz.vercel.app`) 확인
2. **Vercel** → 프로젝트 → **Settings** → **Environment Variables** → `NEXT_PUBLIC_APP_URL` 갱신
3. **Supabase** → **Authentication** → **URL Configuration**:
   - Site URL: `https://matchmaker-xyz.vercel.app`
   - Additional Redirect URLs: `https://matchmaker-xyz.vercel.app/auth/callback`
4. **Google Cloud Console** → OAuth client → **Authorized redirect URIs** 에 (이미 1.3에서 했지만 확인):
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Vercel 도메인을 직접 추가하지는 않음 — Supabase가 중계함)

### 4.4 운영자 알려주기

운영자에게 `https://matchmaker-xyz.vercel.app/login` URL을 보내고 Gmail로 로그인하라고 안내.

---

## 5. 운영 시작 체크리스트

운영자가 첫 사용 전에 해두면 좋은 것:

- [ ] `/surveys/standard` 에서 챕터 1개 이상 + 문항 만들기 (없으면 발송 시 경고)
- [ ] 친구 1~2명 등록해서 발송 → 본인이 받아 응답 → 비교 뷰 동작 확인

---

## 6. 흔한 문제

### 6.1 "허용된 운영자 계정이 아닙니다" 메시지

`OPERATOR_EMAIL` 환경 변수와 로그인한 Gmail이 일치하는지 확인. 대소문자/공백은 자동 정규화됨.

### 6.2 OAuth callback 실패

Supabase / Google 양쪽의 redirect URI가 정확히 일치하는지 확인:
- Google Console: `https://<supabase-ref>.supabase.co/auth/v1/callback`
- Supabase URL Configuration: `https://<vercel-domain>/auth/callback`

### 6.3 친구가 링크 들어갔는데 500 에러

`SUPABASE_SECRET_KEY` (또는 레거시 `SUPABASE_SERVICE_ROLE_KEY`)가 누락되면 친구 측 페이지가 토큰을 검증 못 함. Vercel 환경 변수 확인.

### 6.4 빌드 시 "Module not found" 또는 type 에러

Node 20+ 권장. `node --version` 확인.

---

## 7. 도메인 커스텀 (선택)

vercel.app 서브도메인 대신 자체 도메인 쓰고 싶다면:
1. Vercel → 프로젝트 → **Settings** → **Domains** → 도메인 추가
2. DNS 레코드 안내 따라 설정
3. 등록 후 `NEXT_PUBLIC_APP_URL` 과 Supabase URL Configuration 둘 다 업데이트
