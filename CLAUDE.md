# CLAUDE.md — matchmaker 프로젝트 컨텍스트

> 이 파일은 Claude Code(및 AGENTS.md 호환 도구)에 **프로젝트 컨텍스트**를 제공한다.
> 에이전트 운영 규칙(누가, 어떤 순서로, 어떻게 협업하는지)은 [`AGENTS.md`](./AGENTS.md)를 참고한다.

---

## 1. 프로젝트 한 줄 요약

**matchmaker** — 운영자(개인)가 자기 지인들을 데이터센터화해서 1:1로 어울릴 사람끼리 중매하는 1인 운영자용 사적 CRM.

운영자가 친구 카드를 만들고 → 친구한테 1회용 토큰 링크로 자가 등록·자가진단 설문을 받고 → 운영자가 비교 뷰로 매칭 결정을 내리는 모바일 웹.

전체 스펙은 [`docs/PRD.md`](./docs/PRD.md), 결정 로그는 [`docs/decisions/`](./docs/decisions/) (`000-initial-decisions.md`, `001-runtime-architecture.md`, `002-supabase-publishable-secret-keys.md`, `003-multi-operator-shared-data.md`).

## 2. 핵심 가치 & 톤

- **사이트 단일 운영자, 멀티 이메일 허용** — `OPERATOR_EMAIL` 화이트리스트(CSV)에 등록된 모든 Gmail이 같은 `SITE_OWNER_ID` 로 한 데이터셋을 공유 (D-003)
- **친구는 계정 없음** — 1회용 토큰 링크로만 자가 등록(`/r/[token]`)과 설문 응답(`/s/[token]`) 진입
- **수동 매칭** — LLM/점수 자동 추천 ❌. 비교 뷰의 시각적 단서(같음=초록 / 다름=빨강 / 일부=노랑)만 제공
- **Pair 엔티티로 통합** — 비교 메모와 매칭 이력이 하나의 `pairs` row에 묶임 (D-001 §D4)
- **친구 입력은 친구 본인** — 운영자가 모든 메타데이터를 입력하던 흐름에서, 자가 등록 링크로 친구가 직접 채우게도 가능 (PR #5)
- **운영 비용 ~$0** — Vercel Hobby + Supabase Free + vercel.app 서브도메인
- **AI 런타임 미사용** — 개발 도구로만 사용, 서비스 본체엔 LLM 호출 없음

Non-goal (의도적 제외, V1):
- 점수 기반 자동 매칭 / LLM 정성 분석
- 진짜 다중 테넌트 SaaS (현재는 단일 사이트 공유 모델)
- CSV / 데이터 내보내기
- 알림 (푸시/이메일/SMS)
- 다국어 (한국어 only)
- 친구 본인 계정 / 결과 외부 공유

## 3. 기술 스택

| 항목 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 스타일링 | Tailwind CSS 4 (`@theme` 토큰) + 자체 작성 UI 프리미티브 (`components/ui/*`) |
| 폰트 | Geist Sans / Geist Mono + 시스템 한국어 폰트 fallback |
| Auth + DB | Supabase (Postgres + Google OAuth — 운영자 화이트리스트 + 가입자 자가 가입) |
| 키 체계 | publishable / secret (구 anon/service_role도 fallback — D-002) |
| DB 액세스 | `@supabase/ssr` — service-role 클라이언트 단일 채널 (RLS deny-all + 앱 레이어 인가 — D-001 §D2) |
| 라우트 가드 | `proxy.ts` (Next.js 16) — `resolveGuardTarget` 순수 함수 호출, V2 가드 매트릭스 (PRD §5.5) |
| **단위/통합 테스트** | Vitest + React Testing Library (`tests/{unit,integration}/`) |
| **E2E 테스트** | Playwright (`e2e/tests/`) |
| 배포 | Vercel Hobby (Free) |
| 도메인 | vercel.app 서브도메인 |

선택 근거는 [`docs/PRD.md`](./docs/PRD.md) §7 + 결정 로그 `000`~`006` 참고.

## 4. 디렉토리 구조

```
matchmaker/
├── .claude/             # Claude Code 설정 (에이전트, 스킬, 훅)
├── docs/
│   ├── PRD.md
│   ├── deployment.md
│   ├── review-and-improvements.md
│   └── decisions/       # 000~006 + 작업별 NNN-<slug>.md
├── app/
│   ├── (operator)/      # 인증 필요 라우트 그룹 (대시보드/가입자/비교/설문/설정)
│   ├── signup/          # Google OAuth 가입 진입
│   ├── onboarding/      # 3-step 온보딩 (profile / preferences / survey)
│   ├── me/              # 가입자 자기 페이지 (profile / preferences / survey/[chapter])
│   ├── pending/         # 심사 대기 안내
│   ├── rejected/        # 가입 거절 안내
│   ├── login/           # 운영자 OAuth 진입
│   └── auth/            # OAuth callback / signout
├── components/
│   ├── ui/              # 자체 UI 프리미티브 (Button/Card/Input/Badge/Empty/Stepper/
│   │                    #  TabBar/MultiSelectChip/RangeSlider/RankingPicker/Field)
│   ├── operator/        # 운영자 도메인 (Nav/FriendForm/SurveyEditor/AnswerView/
│   │                    #  SurveysTabs/FriendsStatusTabs/FriendIdealSection/
│   │                    #  IdealMatchRow/ReviewActions/DashboardWidgets)
│   └── user/            # 가입자 도메인 (UserShell/OnboardingStepHeader/
│                        #  MeSectionCard/StatusBanner)
├── lib/
│   ├── supabase/        # server/client/proxy
│   ├── auth/            # operator / user / guard (V2 가드) / onboarding
│   ├── db/              # friends / ideals / answers / surveys / pairs
│   ├── types/           # domain (V2) / v2-options (옵션 사전)
│   ├── validation/      # profile (ProfileSchema + Preferences FormData 파싱)
│   └── utils.ts
├── supabase/migrations/ # 0001_init / 0002_friend_invitations / 0003_v2_self_signup
├── public/
├── tests/               # Vitest 단위/통합 (unit/, integration/)
├── e2e/                 # Playwright spec (tests/)
├── proxy.ts             # Next.js 16 proxy
├── CLAUDE.md            # 이 파일
└── AGENTS.md            # 에이전트 운영 규칙
```

## 5. 디자인 시스템

PRD §6 + 결정 로그 기준. **Black base + Pink accent 다크 톤**. 두 청중에 각기 다른 결.

```css
/* app/globals.css @theme — 발췌 */
@theme {
  --color-bg: #0a0a0b;
  --color-surface: #131316;
  --color-surface-2: #1c1c21;
  --color-fg: #ededee;
  --color-fg-muted: #a1a1aa;
  --color-fg-subtle: #71717a;
  --color-pink-400: #ff5e95;
  --color-pink-500: #ff2d7a;
  --color-success: #34d399;
  --color-danger: #f87171;
  --color-warn: #fbbf24;
}
```

- **운영자 화면**: Linear / Vercel admin 톤의 미니멀 다크. 핑크는 CTA·강조에만
- **친구 화면**: 챕터 클리어 + 심리테스트 결과 톤. `friend-shell` 클래스로 부드러운 핑크 그라데이션
- **모바일 우선** — 360px 폭에서 깨지지 않는 게 검수 기준
- 브레이크포인트: `sm` 640 / `md` 768 / `lg` 1024
- 자동 highlight: 같은 답=초록 / 다른 답=빨강 / 일부 일치=노랑 (점수 X — 단서만)

## 6. 데이터 모델

PRD §4 + 마이그레이션(`0001_init.sql` → `0002_friend_invitations.sql` → `0003_v2_self_signup.sql` → `0004_v2_1_followup.sql` → `0005_friends_self_traits.sql`).

| 테이블 | 역할 | 핵심 규칙 |
|---|---|---|
| `friends` | 가입자 (V2 확장 후) | `auth_user_id UNIQUE` + `recommender_*` NOT NULL + `status` CHECK + `onboarding_step` (1/2/3/null) + **자기 보고 4 항목 (009: smoking/drinking/marriage_view/tattoo enum, nullable)** |
| `friend_ideals` | 이상형 단일값 (1:1) | `friend_id` PK, ON DELETE CASCADE. smoking/drinking/marriage_timing/tattoo enum + age_from/age_to + hometown_same_bonus + free_text |
| `friend_ideal_regions` | 선호 거주지역 다중 (1:N) | PRIMARY KEY (friend_id, region) |
| `friend_ideal_hometowns` | 선호 출신지역 다중 (1:N) | PRIMARY KEY (friend_id, hometown) |
| `friend_ideal_jobs` | 선호 직업군 다중 (1:N) | PRIMARY KEY (friend_id, job) |
| `friend_ideal_personality_keywords` | 성격 키워드 다중 (1:N) | PRIMARY KEY (friend_id, keyword) |
| `friend_ideal_priorities` | 매칭 우선순위 top 3 (1:N ranked) | (friend_id, rank) PK + (friend_id, category) UNIQUE + rank IN (1,2,3) |
| `surveys` | 표준 / 커스텀 설문 | owner당 active standard 1개 강제 (V1 그대로) |
| `survey_chapters` | 챕터 그룹 | `order_index` 기반 정렬 (V1 그대로) |
| `survey_questions` | 문항 + jsonb options | type: mcq_single/mcq_multi/likert/ranking/text (V1 그대로) |
| `survey_answers` | (friend_id × question_id) | **V2: 키 변경** — `invitation_id` 제거, `(friend_id, question_id)` UNIQUE upsert |
| `pairs` | 두 가입자의 비교 메모 + 회고 노트장 | CHECK `friend_a_id < friend_b_id` + UNIQUE — 한 쌍 1행 (V1 그대로) |

V2 폐기 테이블 (0003 마이그레이션이 DROP):
- `survey_invitations` (V1 토큰 흐름)
- `friend_invitations` (V1 운영자 발급 자가 등록 토큰)

V2 friends 에서 제거된 V1 컬럼: `closeness`, `how_we_met`, `kakao_id`, `phone` (0003에서 DROP, 0004에서 `if exists` 가드로 멱등성 보강).

V2.1 신규 RPC function (0004 마이그레이션):
- `upsert_friend_ideal_aggregate(p_friend_id uuid, ...)` — `friend_ideals` 1:1 upsert + 1:N 5개 (regions/hometowns/jobs/personality_keywords/priorities) replace 를 한 plpgsql 트랜잭션 안에서 처리. `lib/db/ideals.ts` 의 `upsertFriendIdealAggregate` 가 단일 RPC 로 호출.

009 신규 컬럼 (0005 마이그레이션):
- `friends.smoking / drinking / marriage_view / tattoo` 4 컬럼 (모두 nullable + CHECK). 본인 자기 보고로 이상형 양방향 매칭에 사용 — `compareSelfTrait` (`lib/db/self-trait-match.ts`) 가 항목별 매트릭스로 same/partial/different/neutral 판정.

주요 규칙:
- 모든 DB 호출은 `lib/db/*` 의 service-role 클라이언트로만 (RLS는 deny-all)
- 운영자 인가: `requireOperator()` + `owner_id` 필터로 앱 레이어에서
- 가입자 인가: `getCurrentUser` / `requireApprovedUser` / `assertOwnFriendRow` / `ensureNotOperator` (`lib/auth/user.ts`)
- 가입자 삭제 → ON DELETE CASCADE 로 friend_ideals / 1:N 다섯 / survey_answers / pairs 모두 정리

## 7. 라우팅 / 사이트맵

| URL | 인증 | 비고 |
|---|---|---|
| `/` | 운영자 | 대시보드 (심사 대기 / 가입자 현황 / 빠른 진입 위젯 3개) |
| `/friends` | 운영자 | 가입자 리스트 + sub-tab (전체/심사 대기/승인/거절) |
| `/friends/[id]` | 운영자 | 가입자 상세 (기본 + 이상형 + 설문 응답 + ReviewActions + Pair) |
| `/friends/[id]/edit` | 운영자 | 가입자 정보 수정 (V2 컬럼) |
| `/compare?a=…&b=…` | 운영자 | 1:1 비교 (메타데이터 + 이상형 양방향 매칭 + 표준 설문 + Pair 패널) |
| `/surveys` (탭: 템플릿) | 운영자 | 표준 + 커스텀 hub |
| `/surveys/standard` | 운영자 | 표준 설문 편집 |
| `/surveys/custom/new`, `/surveys/custom/[id]` | 운영자 | 커스텀 설문 |
| `/settings` | 운영자 | 운영자 설정 |
| `/signup` | — | Google OAuth 가입 진입 |
| `/onboarding/profile` | 가입자 (friends row 없음) | Step 1 (필수: 이름·성별·성취향·추천인) |
| `/onboarding/preferences` | 가입자 (onboarding_step=2) | Step 2 (이상형, 선택) |
| `/onboarding/survey` | 가입자 (onboarding_step=3) | Step 3 (연애 성향 테스트, 선택) |
| `/me` | 가입자 (approved) | 자기 페이지 (대시보드) |
| `/me/profile` | 〃 | 본인 프로필 수정 |
| `/me/preferences` | 〃 | 이상형 수정 |
| `/me/survey` | 〃 | 설문 진행 / 재진입 |
| `/me/survey/[chapter]` | 〃 | 챕터 runner (자동 저장) |
| `/pending` | 가입자 (status=pending) | 심사 대기 안내 |
| `/rejected` | 가입자 (status=rejected) | 가입 거절 안내 |
| `/login`, `/auth/callback`, `/auth/signout` | — | OAuth (운영자·가입자 공용) |

V2 에서 폐기된 V1 라우트: `/friends/new`, `/friends/invites`, `/surveys/send`, `/surveys/invitations`, `/matches`, `/r/[token]/**`, `/s/[token]/**`.

라우팅 가드 매트릭스 (OAuth × 운영자 화이트리스트 × `friends.status` × `onboarding_step`) 는 `lib/auth/guard.ts` 의 `resolveGuardTarget` 순수 함수로 분리되어 있다 (PRD §5.5 + decisions/006).

## 8. 코딩 컨벤션

- **TypeScript strict** — `any` 자제, 미해결 타입 에러로 커밋 금지
- **컴포넌트 네이밍** — PascalCase, 파일명 동일
- **유틸 함수** — camelCase
- **DB 컬럼 / API 필드** — snake_case (PRD 스펙 그대로)
- **주석 한국어 기조** (코드/스킬/PR 모두)
- **커밋 메시지 = 한국어**, 템플릿:
  ```
  [타입] 제목

  - 변경사항 1
  - 변경사항 2
  ```
  타입: `feat` / `fix` / `hotfix` / `refactor` / `infra` / `docs` / `chore` / `ui` / `test`
- **Server → Client function prop 금지** — Server Action(`"use server"`)만 허용 (matchmaker PR #6 에서 친구 detail 페이지 버그 사례)

## 9. 테스트 정책 (도입 예정)

**테스트 코드와 구현 코드는 서로 다른 에이전트가 작성한다** — 자세한 흐름은 [`AGENTS.md`](./AGENTS.md) §3. 여기서는 원칙만:

- **`test-writer`** 가 모든 테스트 파일(`tests/**`, `e2e/**`) 작성·수정
- **`worker`** 는 구현 파일만 다룬다 — 테스트는 **읽기만**, 수정 금지
- 테스트는 **선작성 → 빨갛게 실패 확인 → Lead 자율 채택(결정 로그) → 구현으로 초록 전환** 순서
- spec 약화는 worker 임의 X — Lead에 보고 → Lead가 자율 판단

테스트 도구 매핑:

| 레이어 | 도구 | 위치 |
|---|---|---|
| 단위 (함수, 유틸, 훅, 컴포넌트) | Vitest + RTL | `tests/unit/**/*.test.ts(x)` |
| 통합 (server action, DB 인접) | Vitest | `tests/integration/**/*.test.ts` |
| E2E (사용자 흐름) | Playwright | `e2e/tests/**/*.spec.ts` |

> matchmaker 본 코드에는 아직 테스트가 없다. 다음 `/work` 라운드부터 TDD 게이트로 도입한다.

## 10. 워크플로우 분기 (코드 vs 메타)

| 변경 대상 | 스킬 | 흐름 |
|---|---|---|
| `app/**`, `components/**`, `lib/**`, `supabase/migrations/**` | **`/work`** | 워크트리 → 디자이너·TDD 게이트 → 팀 spawn → peer 검증 → PR |
| `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs/**`, `.claude/**`, `.gitignore`, dev 도구 설정, CI 워크플로우 | **`/meta`** | 워크트리 → Lead 단독 작업 → PR (게이트·팀·peer 생략) |
| 긴급 수정 (`master` 베이스) | **`/hotfix`** | stage 우회 |

판단 기준: **"이 변경이 사용자가 보는 화면·동작·데이터를 바꾸는가"** — 그러면 `/work`, 아니면 `/meta`. 애매하면 `/work` 가 안전.

자세한 분기 표는 [`AGENTS.md`](./AGENTS.md) §6.

## 11. 브랜치 & 워크트리 전략

| 패턴 | 베이스 | 머지 대상 |
|---|---|---|
| `feature/<slug>` | `origin/stage` | `stage` |
| `meta/<slug>` | `origin/stage` | `stage` |
| `hotfix/<slug>` | `origin/master` | `master` |
| `sync/master-to-stage` | `stage` | `stage` (merge commit으로 master 반영) |

> matchmaker의 기본 브랜치는 **`master`** (not `main`).

- 모든 작업은 `.worktrees/feature-<slug>` / `meta-<slug>` / `hotfix-<slug>` 에서 진행
- `master` / `stage` 에 **직접 push 금지** (훅이 차단)
- **force push 금지** (`--force`, `-f`, `+refs/*`)
- `git reset --hard`, `git merge` 직접 수행 금지 (훅이 차단)
- PR 머지는 **사용자만** 수행

## 12. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
# (레거시 anon/service_role도 fallback으로 동작 — D-002)

# 운영자 화이트리스트 (콤마 구분 다중 이메일 가능 — D-003)
OPERATOR_EMAIL=alice@gmail.com,bob@gmail.com
OPERATOR_DISPLAY_NAME=운영자이름

# OAuth callback base URL
NEXT_PUBLIC_APP_URL=https://<vercel-domain>.vercel.app
```

Supabase 콘솔에서 별도 설정:
- Authentication → Providers → Google On
- Google Cloud Console에서 OAuth Client ID/Secret → Supabase에 입력
- Redirect URL: `https://<your-app>.vercel.app/auth/callback`
- (Testing 모드면 OAuth Consent Screen의 Test Users에 운영자 Gmail 추가)

## 13. 결정 로그 (decisions log) 운영

작업 중 발생하는 모든 비자명한 판단은 **Lead 에이전트가 자율적으로 결정**하고 그 즉시 `docs/decisions/<NNN>-<slug>.md`로 기록한다. 사용자에게 매번 물어 승인을 받는 흐름이 아니다 — Lead는 PRD · 결정 로그 · CLAUDE.md 를 근거로 스스로 판단할 권한과 책임을 동시에 가진다.

### 13-1. 무엇을 기록하는가

- TDD 게이트에서 작성한 spec 시나리오와 검증 포인트
- spec 약화/강화 판단 (worker가 통과 어렵다고 보고 시 Lead의 판단)
- 디자이너 호출 여부와 그 결과 톤
- 데이터 모델 변경, 마이그레이션 전략, validation 규칙, 엣지 케이스 처리 방침
- 거절된 대안 (미래 재논쟁 방지)

기록할 필요 없는 것:
- 단순 버그 수정, 명백한 오타/스타일 교정
- PRD / 이전 결정 로그에 이미 명시된 사항의 단순 적용
- 코드 변경의 무엇/어떻게 (git diff와 PR 본문이 충분히 표현)

### 13-2. 파일 형식

```
docs/decisions/
├── 000-initial-decisions.md          # 인터뷰 결정 (기존)
├── 001-runtime-architecture.md       # 코딩 중 자율 결정 14건
├── 002-supabase-publishable-secret-keys.md
├── 003-multi-operator-shared-data.md
├── 004-<slug>.md                     # 다음 작업의 첫 결정
└── ...
```

각 파일 템플릿:

```markdown
# <NNN>-<slug>: <한 줄 제목>

> 작성: <YYYY-MM-DD>  /  작성자: Lead 에이전트
> 관련 작업: <브랜치명 또는 PR 번호>

## 배경
## 결정
## 근거
## 거절된 대안
## 후속 영향
```

### 13-3. 사용자가 끼어들 때

```markdown
## 사용자 개입 (<YYYY-MM-DD>)
- 사용자 지시: <원문 인용>
- 변경된 결정: <어떻게 수정됐는지>
```

기존 "결정"을 덮어쓰지 않고 이력을 남긴다.

### 13-4. 작성 시점

결정이 발생한 **그 작업의 워크트리에서 그 작업의 커밋으로** 포함시킨다. 별도 PR로 분리하지 않는다. PR 본문에 "관련 결정 로그: `docs/decisions/<NNN>-<slug>.md`" 한 줄로 링크.

## 14. 금지 사항 (요약)

- `master` / `stage` 직접 push (훅 차단)
- force push, `git reset --hard`, `git merge` 직접 수행 (훅 차단)
- PR 머지 (사용자만 수행)
- 머지된 브랜치에 추가 push
- 열린 PR이 있는데 같은 주제로 새 PR 생성
- worker 가 테스트 파일(`tests/**`, `e2e/**`) 수정
- test-writer 가 구현 파일(`app/**`, `components/**`, `lib/**` 등) 수정
- peer 검증(lint·sfx) 생략하고 PR 생성
- AWS MCP 호출 시 `--profile read-only` 누락 (훅 차단)
- **비자명한 결정을 내리고도 `docs/decisions/<NNN>-<slug>.md` 미작성**
- **사용자 가시 기능·스택·사이트맵·데이터 모델이 바뀌었는데 `README.md` 미동기화**
- **이 파일의 사실 영역(§3 스택 / §4 디렉토리 구조 / §6 데이터 모델 / §7 사이트맵 / §11 환경 변수)이 코드 변경으로 거짓이 됐는데 같은 PR 에서 미동기화** (책임 매트릭스: [`AGENTS.md`](./AGENTS.md) §5-5)
- **worker 가 이 파일의 정책 영역(§1/§2/§5/§8/§9/§10/§12/§13/§14) 또는 `AGENTS.md` 를 임의 수정** — 정책 변경은 Lead 가 `/meta` 로 별도 PR
- Server Component → Client Component 로 일반 함수 prop 전달 (Server Action 외 금지)

## 15. 참고 문서

- [`README.md`](./README.md) — 서비스 소개 + 빠른 시작
- [`docs/PRD.md`](./docs/PRD.md) — 제품 스펙 (V1 범위, 데이터 모델, UX, DoD)
- [`docs/deployment.md`](./docs/deployment.md) — Supabase + Google OAuth + Vercel 배포 가이드
- [`docs/review-and-improvements.md`](./docs/review-and-improvements.md) — PRD 대비 자체 검수 + 개선 이력
- [`docs/decisions/`](./docs/decisions/) — 작업별 결정 로그 (000~003 + 작업 NNN)
- [`AGENTS.md`](./AGENTS.md) — 에이전트 운영 규칙
- [`.claude/skills/`](./.claude/skills/) — 슬래시 스킬 정의
- [`.claude/agents/`](./.claude/agents/) — 에이전트 정의
