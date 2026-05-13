# 014-account-self-delete: 가입자 자가 탈퇴 (계정 hard delete)

> 작성: 2026-05-13  /  작성자: Lead 에이전트
> 관련 작업: feature/account-self-delete

## 배경

V2 자가 가입 도입 이후 가입자가 자기 데이터를 삭제하고 떠날 수단 부재. PRD §1 의 V1
non-goal "친구 본인 계정 / 결과 외부 공유" 는 V1 운영자 입력 시대의 정신이지만, V2 자가
가입 + OAuth 인증 흐름에서는 운영 위험 (개인정보 보유 + 사용자 권리 부재).

사용자 결정 (오늘):
- 본인 row **hard delete** (soft delete X) — ON DELETE CASCADE 로 모든 자식 테이블 자동 정리
- `/me` 또는 `/me/settings` 에 "계정 삭제" 진입점 — 단순한 발견성
- 텍스트 입력 confirm 패턴 (위험 액션 표준)
- 운영자 차단 (`ensureNotOperator`)
- 본인 row 만 삭제 (`assertOwnFriendRow` 또는 `getCurrentUser` 의 자체 friendId)

DB cascade 점검 결과 (마이그레이션 0007 불필요):
- `friends.auth_user_id` → `references auth.users(id) on delete cascade` (0003:44)
- `survey_answers.friend_id` / `pairs.friend_a_id` / `pairs.friend_b_id` → cascade (0001)
- `friend_ideals.friend_id` / `friend_ideal_regions/hometowns/jobs/personality_keywords/priorities.friend_id` → 모두 cascade (0003)

즉 `auth.users` row 1개를 삭제하면 자동으로 `friends` 행 + 자식 6 테이블 모두 cascade
정리. 마이그레이션 추가 없음.

## 결정

### D1. UX 위치 — `/me` 페이지 하단 "위험 영역" inline expandable

- `/me/settings` 별 페이지 신설 X — 작은 PR 의 스코프 초과 + 가입자 측에 settings 페이지
  부재 (운영자 측만 `/settings` 보유) 의 일관성 유지
- `/me` 페이지 본문 마지막 (로그아웃 form 위) 에 "위험 영역" 섹션을 expandable disclosure
  (`<details>`/`<summary>` native) 로 추가
- expand 했을 때만 텍스트 입력 + 삭제 버튼 노출 — 발견성 + 위험성 균형

### D2. 모달 패턴 — Inline expandable + 본인 이름 입력 confirm

새 ui 프리미티브 (`<ConfirmDialog>`) 도입 X. 기존 `<details>` + `<Input>` + `<Button>` 조합.

흐름:
1. "위험 영역" 클릭 → expand
2. 경고 문구 표시: "계정을 삭제하면 모든 데이터 (프로필 / 이상형 / 연애 성향 테스트 응답
   / 매칭 메모) 가 영구 삭제되며 복구할 수 없어요."
3. 사용자가 본인 `friends.name` 을 입력 — 가입 시 입력한 이름 그대로
4. 입력값이 본인 이름과 정확히 일치하면 "계정 삭제" 버튼 활성화 (그 외엔 disabled)
5. 클릭 → Server Action 호출
6. 성공 시 `/login?deleted=1` 으로 redirect (또는 `/` 흡수 — 가드가 비로그인 처리)

근거:
- 본인 이름 입력은 GitHub/Vercel/Linear 표준 패턴. 단순 "삭제" 키워드 입력보다 본인 확인
  효과 추가 (다른 사용자 이름 기억 어려움).
- 텍스트 입력 confirm 이 체크박스보다 안전 — 우발 클릭 차단.
- inline expandable 이 모달보다 모바일 친화적 + 새 프리미티브 도입 부담 X.

### D3. Server Action — `deleteMeAccountAction`

`app/me/actions.ts` (또는 `app/me/profile/actions.ts` 안) 에 추가:

```ts
"use server";

export async function deleteMeAccountAction(formData: FormData): Promise<void> {
  await ensureNotOperator();
  const session = await getCurrentUser();
  if (!session) throw new Error("세션이 없습니다");

  const confirmName = z.string().trim().min(1).max(80).parse(formData.get("confirmName"));

  // 본인 friends row 의 name 과 정확히 일치 (case-sensitive)
  const sb = createSupabaseServiceClient();
  const { data: friend } = await sb
    .from("friends")
    .select("name")
    .eq("id", session.friendId)
    .single();

  if (!friend || friend.name !== confirmName) {
    throw new Error("입력한 이름이 본인 이름과 일치하지 않습니다");
  }

  // auth.users 삭제 → cascade 로 friends + 자식 6 테이블 자동 정리
  const adminSb = createSupabaseServiceClient();
  const { error } = await adminSb.auth.admin.deleteUser(session.authUserId);
  if (error) throw error;

  redirect("/login?deleted=1");
}
```

**삭제 순서**:
- `auth.users` 삭제만 호출 — `friends` 의 `auth_user_id ON DELETE CASCADE` 가 자동으로
  처리 (DB 단위 일관성 보장, 명시적 friends delete 불필요)
- cascade chain: `auth.users` → `friends` → `friend_ideals`, `friend_ideal_*` 5개,
  `survey_answers`, `pairs` 모두 자동

### D4. 인가 가드

- `ensureNotOperator()` 가 선두 — 운영자가 가입자 액션 시도 시 throw
- `getCurrentUser()` 로 본인 세션 확보 — friend row 있어야 (없으면 throw)
- 본인 이름 confirm — 본인 확인 한 단계 더

`assertOwnFriendRow` 는 friendId 를 클라이언트가 보낼 때 필요한 가드인데, 본 action
은 friendId 를 form 으로 받지 않고 `session.friendId` 만 사용 — 우회 표면 없음.

### D5. `/login?deleted=1` 안내

탈퇴 후 redirect 목적지에서 한 줄 안내:
- "계정이 삭제됐어요. 다시 가입하려면 Google 로 로그인해주세요."

`/login` 페이지가 query param `?deleted=1` 감지해 표시. 없으면 일반 로그인 화면.

### D6. 운영자 측 영향

운영자가 가입자 상세 (`/friends/[id]`) 에서 "거절" 버튼은 그대로. 거절은 status 변경
(soft) 이고 hard delete 는 가입자 본인만 수행 가능. 운영자가 가입자 데이터를 삭제하고
싶으면 별 작업으로 (본 결정 범위 외 — 014 §후속 영향).

## 근거

- ON DELETE CASCADE 가 0001/0003 에 이미 완비돼 있어 마이그레이션 0 + DB 단위 정합성
  자동 보장 (D3 의 단순 auth.users delete).
- `auth.users` 까지 삭제하는 hard delete 가 GDPR-friendly + 사용자 의도 정직. 재가입은
  같은 Google OAuth 로 다시 로그인 → auth.users 재생성 → onboarding 처음부터 자연.
- inline expandable + 본인 이름 confirm 이 모바일 + 토이 프로젝트 톤에 적합. 모달 + 새
  프리미티브 도입 부담 회피.
- 운영자가 가입자 데이터를 hard delete 하는 흐름은 별 결정 — 거절 사유 보관·재신청 정책
  등 운영 룰 결정 후 도입.

## 거절된 대안

- **Soft delete (status='withdrawn' 추가)** — 데이터 보존 + 운영자 회고 가능하지만 GDPR
  관점에서는 개인정보 보유 지속. 사용자 결정 명시 (hard delete).
- **운영자에게 요청 흐름 (`free_text` 메모 전송)** — 가입자가 직접 액션 못 함. 사용자 결정
  외.
- **모달 + `<ConfirmDialog>` 신규 프리미티브** — 새 ui 프리미티브 도입 부담 + 모바일에서
  모달 UX 의 복잡성. inline 패턴이 더 자연.
- **단순 체크박스 + 버튼 2단계** — 우발 클릭 위험. 텍스트 입력이 더 안전.
- **본인 이름 대신 "삭제" 키워드 입력** — 기억 부담 없지만 본인 확인 효과 약함. 본인
  이름은 friends.name 으로 보유 중이라 자연.
- **`friends.delete()` 명시 + auth.users 보존** — auth.users 의 email 도 개인정보. hard
  delete 의도와 모순.

## 후속 영향

- 운영자 측 hard delete (별 작업) — 거절 후 일정 시간 경과 후 자동 삭제 vs 운영자 수동
  삭제 vs 영구 보존 정책 결정 필요. V2 정책 부재 영역.
- `/login?deleted=1` 안내가 추가됨 — 이전엔 `?next=` 만 query param. login 페이지 갱신.
- `/login` 페이지의 `?next=` 와 `?deleted=1` 모두 신뢰 가능한 enum 화 — 안전.
- 마이그레이션 0007 없음. DB cascade 완비 확인.
- CLAUDE.md §7 사이트맵에 `/me` 비고 갱신 (위험 영역 추가)
- README.md 운영 흐름에 자가 탈퇴 흐름 한 줄 추가
- 결정 로그 011 의 `/me` 페이지 본문 구성 표를 본 결정 §D1 으로 확장

## TDD 게이트

- 단위 — `deleteMeAccountAction` 분기 (운영자 차단 / 세션 없음 / 본인 이름 불일치 / 정상
  삭제 → redirect)
- 단위 — `/me` 페이지 본문에 "위험 영역" 섹션 + 본인 이름 input + 삭제 버튼 disabled
  초기 상태 RTL 검증
- 통합 — auth.users delete → cascade 로 friends + 6 자식 테이블 모두 0건 검증 (마이그레이션
  설정 회귀 net)
- 통합 — `/login?deleted=1` 안내 표시
- E2E 골격 — pending+onboarded 가입자가 /me → 위험 영역 expand → 본인 이름 입력 → 삭제
  → /login?deleted=1 도달 + DB row 부재

## 디자이너 게이트

생략. 사유: 새 ui 프리미티브 정의 없음. inline expandable + 기존 `Input` + 위험 색상
`--color-danger` 토큰만 사용. /me 페이지 본문 안에 한 섹션 추가하는 패턴 (기존
`MeSectionCard` 패턴과 동등 단순도). 톤 합의 불필요.

## TDD 게이트 결과 (2026-05-13)

test-writer 라운드 1 채택. 신규 빨강 분포 + 자율 정책 9건 모두 채택.

작성된 파일:
- `tests/unit/delete-me-account-action.test.ts` (16 it) — action 분기 매트릭스
- `tests/unit/me-danger-zone.test.tsx` (11 it) — DangerZone collapsed/expand/input-button 연동
- `tests/unit/login-deleted-banner.test.tsx` (5 it) — `?deleted=1` 안내 분기
- `tests/integration/account-self-delete.test.ts` (13 it, 모두 통과 — 회귀 net)
- `e2e/tests/account-self-delete.spec.ts` (4 spec, fixture 부재 baseline)

worker 통과 목표:
- 단위 신규 빨강 (delete-me-action 16 + me-danger-zone 11 + login-banner 5) = 32 전부 초록
- 통합 13 그대로 (회귀 net — 미래 마이그레이션이 cascade 빼면 즉시 빨강)
- baseline 7건 그대로
- E2E fixture 부재 baseline 통과 목표 외
- lint / tsc / build 통과

Lead 자율 결정 (test-writer 식별 9건):
1. `deleteMeAccountAction` 위치: **`app/me/actions.ts` 신규 파일** — 자가 탈퇴는 프로필 수정과 의미 분리. `profile/actions.ts` 에 흡수 X.
2. `DangerZone` 위치: **`components/user/danger-zone.tsx`** — 기존 user 도메인 namespace.
3. Props: **`{ friendName: string }`** + Server Action 컴포넌트 안에서 직접 import (PR #6 회피).
4. `?deleted=1` 안내: **`app/login/page.tsx` server component 본문 분기** — login-form.tsx 도 가능. spec 은 둘 다 통과.
5. 앞뒤 공백 trim: **`z.string().trim().min(1).max(80)`** 채택. test-writer spec 의 trim 케이스 통과해야 함.
6. case-sensitive: D2 명시 그대로.
7. E2E `EXPECTED_NAME = "Alice"`: fixture seed 의 friends.name 일치 — fixture 부재 baseline 통과 목표 외.
8. 통합 13 baseline 초록 — **회귀 net 채택**. 라운드 1 빨강 보장 원칙 vs 미래 보호 가치 균형, 후자 채택.
9. `me-danger-zone.test.tsx` form element 검증: expand 후에만 form render 되도록 worker 구현하면 자연 통과.

확장 (단위 검증 보강): 다른 결정 — 한국어 이름 ("홍길동") 정확 일치 / 앞뒤 공백 trim 통과 / delete 자체 error 시 redirect 안 함 / friends.select 호출 패턴 모두 spec 으로 잡힘.
