# Matchmaker — Product Requirements Document (V2)

> 운영자 1명이 검토하는 모바일 웹 소개팅 서비스. 사용자가 직접 가입·자기 정보를 채우고, 운영자가 비교 뷰에서 매칭 결정한 뒤 카톡 외부에서 양쪽을 연결한다.

> **V1 → V2 방향 전환 안내**: 이 문서는 2026-05-12 운영자 피드백(`docs/operator-feedback/2026-05-12-direction-change.md`) 기반으로 큰 폭 갱신됐다. V1 의 "운영자가 친구를 직접 등록하는 CRM" 결은 폐기되고 "공개 가입 + 운영자 검토" 결로 바뀌었다. 자세한 결정 근거는 [`docs/decisions/004-v2-self-signup-direction.md`](./decisions/004-v2-self-signup-direction.md).

---

## 1. Product Overview

### 1.1 Concept

운영자(Operator) 1명이 운영하는 모바일 웹 소개팅 서비스. 사용자(Self-signup User)가 가입 페이지에서 본인 정보를 직접 입력하고, 운영자가 그 정보를 보고 적합한 두 사람을 매칭한 뒤 사이트 밖(카톡 등)에서 양쪽을 직접 연결한다.

V1 의 "운영자가 친구 카드를 일일이 채우는 1인 CRM" 결은 폐기됐다. 운영자는 등록·관리 부담에서 벗어나 **검토자** 역할에만 집중한다.

### 1.2 Core Value Proposition

- **운영자**: 매번 친구 정보를 채워 넣지 않고도 사용자 풀을 자연 확장 (친구의 친구까지)
- **사용자**: 사이트에서 본인 결로 자기 정보를 입력 → 운영자가 그 결을 그대로 매칭에 활용 → 데이터 정확성·풍부함 향상
- **운영 비용**: V1 그대로 ~$0 (Vercel Hobby + Supabase Free)

### 1.3 Non-Goals (V2)

- **자동 매칭 추천 알고리즘 / LLM 정성 분석** — V1 그대로. 매칭은 100% 운영자 수동 결정
- **자동 알림 인프라 (이메일/SMS/푸시/카카오 알림톡)** — V1 그대로. 운영자가 카톡 외부 채널로 모든 진행
- **사이트 내 매칭 워크플로우** (수락/거절 UI, 상태 자동 추적) — 매칭은 카톡 외부에서. 사이트는 데이터 등록·표시 + 운영자 메모만
- **카카오 OAuth / Naver / 휴대폰 인증** — Google OAuth 한 채널 (V2.x 검토)
- **다중 운영자 SaaS** — 단일 사이트 단일 운영자 모델
- **CSV / 데이터 내보내기**
- **다국어** (한국어 only)
- **가입자 탈퇴·soft delete·신고·차단 시스템** (V2.x 검토)
- **가입자 본인이 상대 가입자 검색·열람** — 가입자는 자기 정보만 접근, 매칭 결과·상대방 정보도 사이트엔 표시되지 않음

### 1.4 V1 PRD 와의 핵심 결정 차이

| 영역 | V1 | V2 |
|---|---|---|
| 친구 등록 방식 | 운영자 직접 등록 + 1:1 토큰 발급 | **공개 가입 페이지 / Google OAuth 자가 등록** |
| 친구 계정 | 없음 (토큰만) | **있음 (Google OAuth)** |
| 운영자 역할 | CRM 관리자 + 매칭 결정자 | **매칭 검토자 only** |
| 가입 안전 장치 | 없음 (운영자 직접 등록이라 불필요) | **추천인 입력 필수 + 운영자 수동 심사** |
| 매칭 결과 통보 | (의도적으로) 비교 뷰 메모만 | 카톡 외부 진행, 사이트는 운영자 노트장 (의미 동일) |
| 친구 측 라우트 | `/r/[token]`, `/s/[token]` (토큰) | `/signup`, `/onboarding/*`, `/me/*` (OAuth) |

---

## 2. User Roles

### 2.1 Operator (단일 운영자)
- `OPERATOR_EMAIL` 환경변수 화이트리스트에 등록된 Gmail (CSV 다중 등록 가능 — D-003)
- 모든 가입자 row 에 접근·수정 가능
- 가입자 심사 (승인/거절) + 비교 뷰에서 매칭 결정 + 사이트 외부(카톡) 진행
- 운영자 본인은 가입자(friends) row 에 포함되지 않음 — auth.users 만 있고 friends 엔 없음

### 2.2 Self-signup User (자가 가입자)
- Google OAuth 로 `/signup` 페이지에서 가입
- 본인 정보(이름·성별·성취향·추천인 + 선택 정보) 직접 입력
- 가입 직후 status = `pending` (운영자 심사 대기)
- 승인 시 매칭 풀 합류 / 거절 시 가입 차단
- 사이트에서 본인 정보 + 이상형 + 설문 응답만 수정 가능 / 다른 가입자·매칭 결과는 노출 X

### 2.3 Developer (chrisjohn)
- 코드·배포 담당
- 환경변수 설정 / Supabase Console 운영
- 운영자가 UI 에서 못 하는 모든 일

---

## 3. Feature List

### 3.1 가입 / 온보딩

#### 3.1.1 Google OAuth 가입
- `/signup` 진입 → Google OAuth 인증 → 신규 가입자면 `/onboarding/profile` 자동 라우팅
- 이메일은 OAuth 자동 확보 → `friends.email` 자동 저장
- `auth_user_id` UNIQUE — 한 Google 계정 = 한 가입자

#### 3.1.2 Multi-step 온보딩

| Step | 라우트 | 필수 여부 | 내용 |
|---|---|---|---|
| 1 | `/onboarding/profile` | 필수 | 이름·성별·성취향·추천인(이름+관계) + 인스타·출생연도·거주지역·출신지역·직업·연애상태·매칭관심도 (선택) |
| 2 | `/onboarding/preferences` | 선택 (skip 가능) | "이런 분이면 좋겠어요" — 3단 구조 |
| 3 | `/onboarding/survey` | 선택 (skip 가능) | 연애 성향 테스트 (V1 표준 설문 시스템 재활용) |

- Step 1 완료 시점에 `friends` row 생성 (`status='pending'`, `onboarding_step=2` 또는 `null`)
- Step 2·3 는 같은 row 의 컬럼·서브테이블에 채워나가기. skip 시 빈 채로
- 가입 도중 이탈 후 다시 진입 → `onboarding_step` 으로 마지막 단계부터 이어 풀기
- 모든 step 완료/skip 후 → `/pending` 자동 라우팅

#### 3.1.3 추천인 필드
- 가입자가 "이름 + 어떻게 아는지" 1줄 입력 (필수)
- 예: `"김민수, 대학 동기"`
- 운영자 심사 시 핵심 검토 정보

### 3.2 심사 (운영자)

- `/friends` 에 sub-tab "심사 대기 / 승인됨 / 거절됨 / 전체"
- 운영자는 가입자 상세 페이지(`/friends/[id]`)에서 추천인 + 기본 정보 + 이상형 + 설문 응답을 본 뒤
  - [✓ 승인] → `status='approved'`, 가입자 `/me/*` 정상 접근 가능
  - [✗ 거절] → `status='rejected'` + `rejected_reason` 비공개 메모. 가입자는 `/rejected` 안내 페이지만 봄
- 인라인 빠른 승인·거절은 위험 → 반드시 상세 페이지 거치게

### 3.3 자기 페이지 (가입자)

#### 3.3.1 대시보드 `/me`
- 자기 정보 요약 + 분기 진입 카드 3개:
  - 내 프로필 → `/me/profile`
  - 이런 분이면 좋겠어요 → `/me/preferences`
  - 연애 성향 테스트 → `/me/survey`
- 이상형·설문 미입력 시 "작성 안 하면 매칭 확률이 낮아져요" 안내

#### 3.3.2 `/me/profile` — 기본 정보 수정
- 가입 폼 §3.1.2 Step 1 의 모든 필드 수정 가능
- 이메일 / `auth_user_id` 는 read-only

#### 3.3.3 `/me/preferences` — "이런 분이면 좋겠어요" (3단 구조)

##### §1 선호 조건 (구조화 8개 항목)
| 항목 | 옵션 |
|---|---|
| 선호 나이대 | 출생연도 from~to |
| 선호 거주지역 | 광역시도 다중 + "상관없음" |
| 선호 출신지역 | 광역시도 다중 + "상관없음" + "같은 출신지역 우대" boolean |
| 흡연 | `상관없음 / 비흡연자만` |
| 음주 | `상관없음 / 자주 OK / 가끔만 OK / 안 마시는 사람만` |
| 결혼 시점관 | `상관없음 / 1~2년 내 / 3년 이상 / 연애 위주` |
| 선호 직업군 | 대분류 다중 (사무직/전문직/공무원/IT·개발/예술·창작/서비스/자영업/학생/기타) + "상관없음" |
| 문신 | `상관없음 / 없는 사람만 / 작은 것 OK` |

모든 항목 선택 입력 (빈 칸 OK). 모든 옵션에 "상관없음" 명시.

##### §2 성격·결 (키워드 + 자유 텍스트)
- **성격 키워드 다중 선택** (15개): 다정함 / 유머 / 진중함 / 활발함 / 차분함 / 자상함 / 똑똑함 / 자기관리 / 안정적 / 자유로운 / 책임감 / 친화력 / 솔직함 / 배려심 / 호기심
- **이상형 한마디** (자유 텍스트 300자) — 키워드로 못 잡히는 결

##### §3 매칭 우선순위 (ranking — top 3)
6개 카테고리 중 본인에게 가장 중요한 3개를 1·2·3순위로:
1. 외모 · 2. 성격 · 3. 안정성 · 4. 결혼관 · 5. 가치관 · 6. 라이프스타일

#### 3.3.4 `/me/survey` — 연애 성향 테스트
- V1 표준 설문 시스템 그대로 (chapter / question / answer)
- 토큰 진입(`/s/[token]/[chapter]`)이 OAuth 진입(`/me/survey`)으로 변경
- 가입자가 본인 답변 수정 가능 (V1 의 1회용 제약 폐기)

#### 3.3.5 `/pending` · `/rejected`
- `/pending`: "심사 중이에요. 운영자가 검토 후 알려드릴게요" 안내
- `/rejected`: "검토 결과 가입이 어렵게 됐어요. 자세한 사유는 운영자에게 문의" (사유는 비공개)

### 3.4 매칭 / 비교 뷰 (운영자)

#### 3.4.1 매칭 흐름 (사이트 외부 100%)
1. 운영자가 비교 뷰에서 두 가입자 비교
2. [💘 큐피드 시작] → `pairs.introduced=true` (운영자 본인 회고용 마크)
3. 운영자가 사이트 밖(카톡)에서 가입자 A 에게 직접 "이런 분 어떠세요" 안내 + 상대방 요약 전달
4. A 의 답변 카톡으로 받음
5. (A 가 OK 면) B 에게도 같은 흐름
6. 양쪽 OK 시 운영자가 카톡으로 양쪽 인스타 ID 서로 공유
7. 운영자가 사이트 `pairs.outcome_memo` 에 회고 메모 (선택)

**사이트는 이 흐름의 상태를 자동 추적하지 않는다.** 운영자가 사이트에 적는 메모는 본인 회고용 노트장일 뿐, "현재 진행 중 매칭" 같은 시스템 상태는 존재하지 않는다.

#### 3.4.2 비교 뷰 (`/compare?a=&b=`) 확장
- V1 그대로 + 신규 섹션:
  - **메타데이터 비교** (V1 같음·다름 색상 단서)
  - **이상형 매칭 — 양방향** (신규):
    - "민수의 이상형 ↔ 지영의 프로필" 색상 단서 (✅ same / ⚠️ partial / ❌ different / · neutral)
    - "지영의 이상형 ↔ 민수의 프로필" 같이 양방향
    - 성격 키워드 교집합 시각화 / 자유 텍스트 나란히
  - **표준 설문 답변 비교** (V1 그대로, 접기/펼치기)
  - **Pair 메모 / 큐피드** (V1 그대로)

### 3.5 설문 관리 (운영자)
- `/surveys/standard` — 표준 설문 (= "연애 성향 테스트") 챕터·문항 편집
- `/surveys/custom/{new,[id]}` — 특정 가입자에게 추가 커스텀 설문 보내기 (V1 그대로 유지)
- nav 에서 직접 진입 항목 X — 대시보드 "빠른 진입" 또는 설정에서 접근

### 3.6 운영자 대시보드 (`/`)
3개 위젯:
1. **⏳ 심사 대기** (n) — 신규 가입자 검토 리스트
2. **📊 가입자 현황** — 총 가입자 수 / 매칭관심도 적극 / 연애성향 응답 비율
3. **빠른 진입** — 친구 리스트 / 비교 뷰 / 설문 편집

V1 의 "응답 대기 중인 설문", "최근 매칭" 위젯 폐기 (V2 모델에서 의미 없음).

---

## 4. Data Model

### 4.1 테이블 목록

| 테이블 | 변화 | 비고 |
|---|---|---|
| `friends` | **확장 + 일부 제거** | 자가 가입자 + 운영자 메모 통합 row |
| `friend_ideals` | **신규 (1:1)** | 이상형 단일값 (enum/scalar/free_text) |
| `friend_ideal_regions` | **신규 (1:N)** | 선호 거주지역 다중 |
| `friend_ideal_hometowns` | **신규 (1:N)** | 선호 출신지역 다중 |
| `friend_ideal_jobs` | **신규 (1:N)** | 선호 직업군 다중 |
| `friend_ideal_personality_keywords` | **신규 (1:N)** | 성격 키워드 다중 |
| `friend_ideal_priorities` | **신규 (1:N, ranked)** | 매칭 우선순위 top 3 |
| `surveys` | 변화 X | V1 그대로 |
| `survey_chapters` | 변화 X | V1 그대로 |
| `survey_questions` | 변화 X | V1 그대로 |
| `survey_answers` | **스키마 변경** | 키 `(invitation_id, question_id)` → `(friend_id, question_id)` |
| `pairs` | 변화 X | V1 그대로 (운영자 회고 노트장) |
| `survey_invitations` | **폐기** | 토큰 흐름 폐기 |
| `friend_invitations` | **폐기** | 토큰 흐름 폐기 |

### 4.2 `friends` 상세 (V2)

```
friends
├─ id uuid PK
├─ owner_id uuid                       -- SITE_OWNER_ID 한 값 (D-003)
├─ auth_user_id uuid UNIQUE             -- auth.users(id) FK, 자가 가입자만 채워짐
├─ email text                           -- OAuth 자동 확보
│
├─ name text NOT NULL                   -- 가입자 본인 입력
├─ gender enum NOT NULL
├─ preferred_gender enum NOT NULL
│
├─ birth_year int                       -- 권장
├─ region text                          -- 거주지역, 권장
├─ hometown text                        -- 출신지역, 권장 (신규)
├─ occupation text                      -- 권장
├─ instagram text                       -- 권장
├─ relationship_status enum             -- 권장
├─ match_interest enum                  -- 권장
│
├─ recommender_name text NOT NULL       -- 추천인 이름 (신규 필수)
├─ recommender_relation text NOT NULL   -- "대학 동기" 등 (신규 필수)
│
├─ status enum NOT NULL DEFAULT 'pending'
│     CHECK (status IN ('pending','approved','rejected'))
├─ rejected_reason text                 -- 운영자 비공개 메모
├─ onboarding_step smallint             -- 1/2/3/null=done
│
├─ tags text[]                          -- 운영자 큐레이션
├─ notes text                           -- 운영자 자유 메모
│
└─ created_at, updated_at
```

V1 에서 제거: `closeness`, `how_we_met`, `kakao_id`, `phone`.

### 4.3 `friend_ideals` (1:1)

```
friend_ideals
├─ friend_id uuid PK FK ON DELETE CASCADE
├─ age_from smallint
├─ age_to smallint
├─ hometown_same_bonus boolean DEFAULT false
├─ smoking enum('any','non_smoker_only')
├─ drinking enum('any','often_ok','sometimes_only','non_drinker_only')
├─ marriage_timing enum('any','within_2y','over_3y','dating_focus')
├─ tattoo enum('any','none_only','small_ok')
├─ free_text text                       -- 300자 (§2 자유)
└─ updated_at
```

미입력 가입자엔 row 없음 (sparse).

### 4.4 다중선택 1:N 테이블

```
friend_ideal_regions(friend_id, region) PK (friend_id, region)
friend_ideal_hometowns(friend_id, hometown) PK (friend_id, hometown)
friend_ideal_jobs(friend_id, job) PK (friend_id, job)
friend_ideal_personality_keywords(friend_id, keyword) PK (friend_id, keyword)

friend_ideal_priorities
├─ friend_id uuid FK
├─ rank smallint CHECK (rank IN (1,2,3))
├─ category enum('appearance','personality','stability','marriage_view','values','lifestyle')
├─ PRIMARY KEY (friend_id, rank)
└─ UNIQUE (friend_id, category)         -- 한 카테고리는 한 순위에만
```

### 4.5 `pairs` (V1 그대로)

```
pairs
├─ id, owner_id
├─ friend_a_id, friend_b_id            -- CHECK friend_a_id < friend_b_id, UNIQUE
├─ comparison_memo text                 -- 운영자 비교 메모
├─ introduced boolean
├─ introduced_at timestamptz
├─ outcome enum
├─ outcome_memo text                    -- 운영자 회고
└─ created_at, updated_at
```

새 모델에서 매칭 진행은 사이트 외부에서 일어나므로 `pairs` 는 자동 상태 추적이 아닌 **운영자의 회고 노트장**으로 동작한다.

### 4.6 `survey_answers` 스키마 변경

```
survey_answers
├─ id uuid PK
├─ friend_id uuid FK ON DELETE CASCADE  -- ← invitation_id 에서 변경
├─ question_id uuid FK
├─ value jsonb
├─ updated_at
└─ UNIQUE (friend_id, question_id)
```

가입자가 본인 답변을 수정 가능 (V1 의 1회용 제약 폐기).

### 4.7 폐기 테이블
- `survey_invitations` — 토큰 발급 흐름 폐기
- `friend_invitations` — 운영자 측 1:1 토큰 발급 폐기

### 4.8 인증 / 인가
- **운영자 인증**: `OPERATOR_EMAIL` 환경변수 화이트리스트 — D-003 그대로
- **가입자 인증**: Google OAuth (Supabase Auth) — `friends.auth_user_id` 와 1:1
- **인가 모델**: V1 의 service-role 클라이언트 단일 채널 + 앱 레이어 `owner_id` 필터 + 가입자별 권한 분기 (자기 friends row 만 접근)
- 운영자는 모든 friends row 접근. 가입자는 `auth_user_id = current user` 인 row 만 접근.

---

## 5. Sitemap & Routing

### 5.1 가입자 측 라우트
| URL | 인증 | 설명 |
|---|---|---|
| `/signup` | 비로그인 OK | Google OAuth 가입 진입 |
| `/onboarding/profile` | 가입자, friends row 없음 | Step 1 (필수) |
| `/onboarding/preferences` | 가입자, onboarding_step=2 | Step 2 (선택) |
| `/onboarding/survey` | 가입자, onboarding_step=3 | Step 3 (선택) |
| `/me` | 가입자, status=approved | 자기 페이지 대시보드 |
| `/me/profile` | 〃 | 기본 정보 수정 |
| `/me/preferences` | 〃 | 이상형 등록·수정 |
| `/me/survey` | 〃 | 연애 성향 테스트 |
| `/pending` | 가입자, status=pending | 심사 대기 안내 |
| `/rejected` | 가입자, status=rejected | 가입 거절 안내 |

### 5.2 운영자 측 라우트
| URL | 인증 | 설명 |
|---|---|---|
| `/` | 운영자 | 대시보드 (위젯 3개) |
| `/friends` | 운영자 | 가입자 리스트 + sub-tab (전체/심사 대기/승인됨/거절됨) |
| `/friends/[id]` | 운영자 | 가입자 상세 (기본 + 이상형 + 설문응답 + Pair 메모 + 운영자 메모) |
| `/friends/[id]/edit` | 운영자 | 가입자 정보 수정 (운영자 권한) |
| `/compare?a=&b=` | 운영자 | 비교 뷰 (메타데이터 + 이상형 양방향 + 설문 + Pair 메모) |
| `/surveys/standard` | 운영자 | 설문 편집 (nav 직접 진입 X) |
| `/surveys/custom/new` `/surveys/custom/[id]` | 운영자 | 커스텀 설문 |
| `/settings` | 운영자 | 설정 |

### 5.3 인증 공용
- `/login` — 운영자용 (Google OAuth)
- `/auth/callback` — OAuth 콜백 (운영자·가입자 공용)
- `/auth/signout` — 로그아웃

### 5.4 폐기되는 V1 라우트
- `/friends/new` — 운영자 직접 등록 폐기
- `/friends/invites` — 1:1 토큰 발급 폐기
- `/r/[token]` (+ done/expired) — 토큰 자가 등록 폐기
- `/s/[token]/[chapter]` (+ done/expired) — 토큰 설문 폐기
- `/surveys` (nav 항목) / `/surveys/send` / `/surveys/invitations` — 발송 흐름 폐기
- `/matches` (nav 항목) — V2 에서 매칭 자동 추적 X. `/friends/[id]` 또는 `/compare` 에서 직접 확인

### 5.5 라우팅 가드 (`proxy.ts`)

```
OAuth 인증 X
  → /signup, /login, /pending, /rejected, /auth/* 만 접근 가능
  → 그 외 라우트는 /login 또는 /signup 으로 리다이렉트

OAuth 인증 O
  ├─ OPERATOR_EMAIL 화이트리스트 통과
  │    → /(operator)/* 접근 가능
  │    → /(operator)/* 외 라우트로 들어오면 / 로 리다이렉트
  │
  └─ 화이트리스트 미통과 (= 가입자)
       ├─ friends row 없음
       │    → /onboarding/profile 자동 라우팅
       ├─ friends.status = 'pending'
       │    → /pending 으로 차단, /me/* 접근 불가
       ├─ friends.status = 'rejected'
       │    → /rejected 안내
       └─ friends.status = 'approved'
            → /me/* 정상 접근 가능
```

---

## 6. UX Detail

### 6.1 운영자 측 톤
- V1 그대로 — Linear / Vercel admin 결의 미니멀 다크
- Black base + Pink accent — `@theme` 토큰 그대로 (`app/globals.css`)
- 핑크는 CTA·강조에만, 본문은 무채색
- 모바일 우선, sm/md/lg 브레이크포인트

### 6.2 가입자 측 톤
- V1 친구 측 `friend-shell` 그라데이션 + 게이미피케이션 그대로 활용
- 챕터 클리어 / 심리 테스트 결과 톤
- 핑크 비중 ↑, 부드러운 결
- 온보딩 multi-step 의 각 step 클리어 시 가벼운 결과 카드

### 6.3 가입자 대시보드 (`/me`) 카드 구조

```
┌──────────────────────────────────────┐
│ 안녕하세요, [이름]님 🩷               │
│ 심사 상태: ✅ 승인됨                  │
├──────────────────────────────────────┤
│ [내 프로필]    → /me/profile         │
│ 기본 정보 보기/수정 (n/13 채움)       │
├──────────────────────────────────────┤
│ [이런 분이면 좋겠어요] → /me/preferences │
│ §1 선호 조건 §2 성격·결 §3 우선순위    │
│ 안내: 작성 안 하면 매칭 확률 낮아져요   │
├──────────────────────────────────────┤
│ [연애성향 테스트] → /me/survey        │
│ 응답 완료 / 미응답 / 진행 중           │
└──────────────────────────────────────┘
```

### 6.4 운영자 대시보드 (`/`) 위젯

```
⏳ 심사 대기 (n)
  ┌────────────────────────────┐
  │ 김민수 · 2일 전 가입         │
  │ 추천인: 김영희 (대학 동기)    │
  │ 매칭관심도: 적극             │
  │ [상세 보기]                  │
  └────────────────────────────┘
  [친구 리스트로 모두 보기 →]

📊 가입자 현황
  총 가입자 N명
  매칭관심도 적극 N명
  연애성향 응답 N/M명

빠른 진입
  [👥 친구 리스트] [⚖️ 비교 뷰] [📋 설문 편집]
```

### 6.5 비교 뷰 시각 단서
| 일치도 | 색 | 의미 |
|---|---|---|
| ✅ same | 초록 | 동일 / 부합 |
| ⚠️ partial | 노랑 | 부분 부합 (Likert 차 1 이내, mcq_multi 부분 겹침 등) |
| ❌ different | 빨강 | 다름 / 부합 안 함 |
| · neutral | 회색 | 미응답 / "상관없음" |

이상형 매칭은 양방향:
- A 의 ideal ↔ B 의 profile
- B 의 ideal ↔ A 의 profile

### 6.6 알림 채널
- **자동 알림 0** (V1 그대로 — non-goal)
- 운영자가 카톡·인스타 DM 등 외부 채널로 가입자에게 안내
- 사이트 내 미확인 뱃지 (가입자 측 `/me` 대시보드의 새 상태) 정도만

---

## 7. Tech Stack

| 항목 | 선택 | 변화 |
|---|---|---|
| 프레임워크 | Next.js 16 (App Router) + TypeScript | V1 그대로 |
| 스타일링 | Tailwind CSS 4 (`@theme`) + 자체 UI 프리미티브 | V1 그대로 |
| 폰트 | Geist Sans / Geist Mono + 한국어 시스템 fallback | V1 그대로 |
| Auth + DB | Supabase (Postgres + Google OAuth) | OAuth 적용 범위 확장 (운영자 + 가입자) |
| 키 체계 | publishable / secret (D-002) | V1 그대로 |
| DB 액세스 | `@supabase/ssr` — service-role 단일 채널 (RLS deny-all + 앱 레이어 인가) | V1 그대로 |
| 라우트 가드 | `proxy.ts` (Next.js 16) | **확장** — 가입자 status 분기 추가 |
| 단위/통합 테스트 | Vitest + RTL | 도입 예정 |
| E2E 테스트 | Playwright | 도입 예정 |
| 배포 | Vercel Hobby (Free) | V1 그대로 |
| 도메인 | vercel.app 서브도메인 | V1 그대로 |

토큰 발급(nanoid)·invitation 데이터 모델은 V2 에서 의미 사라짐 (관련 코드 폐기).

---

## 8. Environment Variables

V1 그대로:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
# (레거시 anon/service_role도 fallback — D-002)

# 운영자 화이트리스트 (콤마 구분 다중 — D-003)
OPERATOR_EMAIL=alice@gmail.com,bob@gmail.com
OPERATOR_DISPLAY_NAME=운영자이름

# 토큰 링크 베이스 (가입자 측 라우트에선 토큰 없지만 OAuth callback 기준)
NEXT_PUBLIC_APP_URL=https://<vercel-domain>.vercel.app
```

추가 환경변수 없음.

---

## 9. Out of Scope (V2)

V1 non-goal 중 유지:
- 자동 매칭 추천 알고리즘 / LLM
- 자동 알림 인프라 (이메일/SMS/푸시/카카오 알림톡)
- 사이트 내 매칭 워크플로우·상태 자동 추적
- CSV / 데이터 내보내기
- 다국어
- 다중 운영자 SaaS

V2 에서 풀린 V1 non-goal:
- ~~친구 본인의 계정/회원가입~~ → **풀림** (Google OAuth 자가 가입이 핵심 모델)

V2 추가 non-goal (V2.x / V3 검토):
- 가입자 탈퇴 / soft delete / 비활성화
- 추천인 자동 검증 (트래픽 증가 시 도입)
- 부적절 가입자 신고·차단
- 카카오 OAuth / Naver / 휴대폰 인증 (Gmail 외 사용자 풀 확장)
- Pair 거절 후 cooldown / 재매칭 차단
- 매칭 거절 사유 가입자 노출 (현재 비공개 default)
- 운영자 휴면 / 부재 시 가입자에게 자동 안내

---

## 10. Success Criteria

- 운영자가 모바일 브라우저에서 Google 로그인 → 대시보드 진입까지 5초 이내
- 가입자 온보딩 Step 1 (필수 4항목) 30초 이내 완료 가능
- 가입자가 가입 → 운영자 승인 → 매칭 발생까지 흐름이 사이트 내·외 채널에서 모두 자연
- 운영자가 가입자 상세 페이지에서 이상형·설문 응답·운영자 메모를 한 화면에서 조망 가능
- 비교 뷰에서 두 가입자의 이상형 매칭 양방향이 색상 단서로 즉시 인지 가능
- 모든 화면 모바일 360px 폭에서 깨지지 않음
- 가입자가 자기 정보 외 다른 가입자·매칭 결과 접근 시도 시 차단 (RLS 또는 앱 레이어)

---

## 11. Definition of Done (V2)

### 11-A. 데이터·인증 기반
- [ ] 마이그레이션 `0003_v2_self_signup.sql` 적용 가능 (friends 확장 + friend_ideals + 1:N 분리 + survey_answers 키 변경 + 폐기 테이블 drop)
- [ ] `proxy.ts` 새 라우팅 가드 (가입자 status 분기) 동작
- [ ] `lib/auth/operator.ts` 그대로 + 신규 `lib/auth/user.ts` (가입자 세션 헬퍼) 추가
- [ ] 가입자가 본인 friends row 외 접근 시도 시 차단됨

### 11-B. 가입·온보딩
- [ ] `/signup` 진입 + Google OAuth + Step 1 필수 흐름 통과
- [ ] Step 2·3 skip 가능, 미입력 가입자 row 정상
- [ ] 가입 도중 이탈 후 재진입 시 `onboarding_step` 으로 이어 풀기
- [ ] Step 1 완료 시점에 `friends` row 생성 + `status='pending'`

### 11-C. 운영자 측
- [ ] 대시보드 위젯 3개 (심사 대기 / 가입자 현황 / 빠른 진입)
- [ ] `/friends` sub-tab (전체/심사 대기/승인됨/거절됨) 필터
- [ ] `/friends/[id]` 상세 — 기본 + 이상형 + 설문 응답 + Pair 메모 + 운영자 메모 모두 표시
- [ ] [✓ 승인] / [✗ 거절] (+ rejected_reason 메모) 액션
- [ ] `/compare?a=&b=` 비교 뷰 확장 — 메타데이터 + 이상형 양방향 + 설문 + Pair 메모

### 11-D. 가입자 측
- [ ] `/me` 대시보드 + 분기 카드 3개
- [ ] `/me/profile` `/me/preferences` `/me/survey` 수정 가능
- [ ] `/pending` `/rejected` 적절한 안내 노출

### 11-E. V1 자산 폐기
- [ ] `/r/[token]`, `/s/[token]` 라우트·코드 폐기
- [ ] `lib/db/friend-invitations.ts`, `lib/db/invitations.ts` 폐기
- [ ] `/friends/new`, `/friends/invites` 라우트 폐기
- [ ] `/surveys/send`, `/surveys/invitations`, `/matches` 라우트 폐기

### 11-F. README + 결정 로그 동기화
- [ ] `README.md` 갱신 (V2 사용자 모델 반영)
- [ ] `docs/decisions/004-v2-self-signup-direction.md` 작성됨 (이 PR에서 같이)
- [ ] `docs/deployment.md` 의 V1 토큰 흐름 안내 갱신
- [ ] `CLAUDE.md` §6 데이터 모델·§7 사이트맵·§11 환경변수 동기화 (worker가 코드 PR에서 함께)

---

## 12. V1 → V2 변환 가이드

코드 작업 시 참고할 폐기·재활용·신규 분류:

### 폐기 (DELETE)
- `app/r/[token]/**` 전체
- `app/s/[token]/**` 전체
- `app/(operator)/friends/new/**`
- `app/(operator)/friends/invites/**`
- `app/(operator)/send/**` (= `/surveys/send`)
- `app/(operator)/surveys/invitations/**`
- `app/(operator)/matches/**`
- `lib/db/friend-invitations.ts`
- `lib/db/invitations.ts` (또는 OAuth answer 흐름으로 재작성)

### 재활용 (KEEP, MINOR REFACTOR)
- `app/(operator)/page.tsx` (대시보드 — 위젯 3개로 재구성)
- `app/(operator)/friends/page.tsx` (sub-tab + 신규 컬럼 표시)
- `app/(operator)/friends/[id]/page.tsx` (이상형·설문 응답 섹션 + 심사 액션 추가)
- `app/(operator)/friends/[id]/edit/page.tsx` (필드만 V2 로 갱신)
- `app/(operator)/compare/**` (이상형 양방향 시각화 추가)
- `app/(operator)/surveys/standard/**`, `app/(operator)/surveys/custom/**`
- `app/(operator)/settings/page.tsx`
- `app/login/**`, `app/auth/**`
- `components/ui/**` (자체 프리미티브 전부)
- `components/operator/**` (FriendForm 은 V2 필드로 갱신)
- `lib/auth/operator.ts`, `lib/supabase/**`, `lib/utils.ts`, `lib/types/domain.ts`
- `pairs` 관련 모든 코드
- `surveys`, `survey_chapters`, `survey_questions`, `survey_answers` 관련 코드 (answers 키만 변경)

### 신규 (NEW)
- `app/signup/page.tsx`
- `app/onboarding/{profile,preferences,survey}/page.tsx` + 클라이언트 컴포넌트
- `app/me/page.tsx` (대시보드)
- `app/me/{profile,preferences,survey}/page.tsx`
- `app/pending/page.tsx`, `app/rejected/page.tsx`
- `lib/auth/user.ts` (가입자 세션 헬퍼)
- `lib/db/ideals.ts` (이상형 1:1 + 1:N 쿼리 헬퍼)
- `components/user/**` (가입자 측 도메인 컴포넌트)
- `supabase/migrations/0003_v2_self_signup.sql`

### 코드 작업 분할 권장 (별도 `/work` PR 시리즈)
1. **PR-A**: 마이그레이션 + `lib/auth/user.ts` + `proxy.ts` 가드 (백엔드 기반)
2. **PR-B**: `/signup` + `/onboarding/*` (가입 흐름)
3. **PR-C**: `/me/*` (자기 페이지)
4. **PR-D**: 운영자 대시보드 위젯 + `/friends` sub-tab + `/friends/[id]` 확장
5. **PR-E**: 비교 뷰 (`/compare`) 이상형 양방향 확장
6. **PR-F**: V1 라우트·코드 폐기 (cleanup)
7. **PR-G**: README 갱신 + 자체 검수 보고

---

## 13. 참고 문서

- [`README.md`](../README.md) — 서비스 소개 + 빠른 시작
- [`docs/deployment.md`](./deployment.md) — Supabase + Google OAuth + Vercel 배포 가이드
- [`docs/review-and-improvements.md`](./review-and-improvements.md) — V1 자체 검수
- [`docs/operator-feedback/2026-05-12-direction-change.md`](./operator-feedback/2026-05-12-direction-change.md) — V2 방향 전환의 운영자 카톡 원본
- [`docs/decisions/000-initial-decisions.md`](./decisions/000-initial-decisions.md) — V1 인터뷰 결정 (보존)
- [`docs/decisions/001-runtime-architecture.md`](./decisions/001-runtime-architecture.md) — V1 런타임 결정 (보존)
- [`docs/decisions/002-supabase-publishable-secret-keys.md`](./decisions/002-supabase-publishable-secret-keys.md) — Supabase 키 이전 (보존)
- [`docs/decisions/003-multi-operator-shared-data.md`](./decisions/003-multi-operator-shared-data.md) — 다중 이메일 + SITE_OWNER_ID (보존)
- [`docs/decisions/004-v2-self-signup-direction.md`](./decisions/004-v2-self-signup-direction.md) — V2 방향 전환 결정 (이 PR 에서 같이)
- [`CLAUDE.md`](../CLAUDE.md) — 프로젝트 컨텍스트
- [`AGENTS.md`](../AGENTS.md) — 에이전트 운영 규칙
