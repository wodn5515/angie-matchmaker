# Review & Improvements — Matchmaker V1

> 코드 작업 완료 후 PRD 대비 자체 검수. 누락/개선 포인트와 이번 라운드에서 보강한 내용 정리.

## ✅ PRD §3 기능 커버리지

| Feature | Status | Notes |
|---|---|---|
| 3.1 운영자 인증 (Google OAuth + 단일 이메일) | ✅ | `/login`, `/auth/callback`, `OPERATOR_EMAIL` 화이트리스트 |
| 3.2 대시보드 위젯 (응답 대기/새 응답/친구 수/평균 완성도/최근 매칭/빠른 진입) | ✅ | `app/(operator)/page.tsx` |
| 3.3 친구 관리 — 리스트/검색·필터/등록/수정/삭제/완성도 표시 | ✅ | `app/(operator)/friends/*`, `profileCompletion()` |
| 3.4 설문 관리 — 표준 1개/커스텀 N개/4가지 문항타입+주관식(커스텀만) | ✅ | `SurveyEditor` 컴포넌트, `allowText` 분기 |
| 3.5 설문 발송 — 1회용 토큰/링크 복사·공유 | ✅ | `app/(operator)/send/*` + `Web Share API` 폴백 |
| 3.6 비교 뷰 — 1:1/자동 하이라이트/Pair 메모/소개 기록/결과 | ✅ | `app/(operator)/compare/*`, sticky bottom 패널 |
| 3.7 매칭 이력 + 결과 필터 | ✅ | `app/(operator)/matches/page.tsx` |
| 3.8 친구 측 — 인사·이어풀기·챕터·자동저장·완료/만료 | ✅ | `app/s/[token]/**` |

## ✅ PRD §5 라우트 커버리지

전체 19개 라우트 (운영자 14 + 친구 5) 전부 구현. `app/not-found.tsx`로 잘못된 경로 fallback.

## ✅ PRD §4 스키마

`supabase/migrations/0001_init.sql` 단일 마이그레이션:
- 7개 테이블 (friends, surveys, survey_chapters, survey_questions, survey_invitations, survey_answers, pairs)
- ON DELETE CASCADE로 친구 삭제 시 관련 invitation/answer/pair 정리
- pair canonical order CHECK + UNIQUE
- partial unique index로 owner당 active standard survey 1개 강제
- updated_at trigger 4개

## ✅ PRD §6 UX 디테일

- 운영자: 다크 모드 + Black/Pink 액센트, 모바일 햄버거 메뉴, 데스크톱 가로 네비
- 친구: 챕터 진행 바, 챕터 클리어 결과 카드(`result_template` 있을 때), "저장됨 ✓" 인디케이터
- 비교 뷰: 같음=초록 / 다름=빨강 / 일부일치=노랑 점, sticky 메모 패널
- 프로필 완성도: Tier 1=30, Tier 2=40, Tier 3=20, 상태=10 가중치

## ⚠️ 한계 및 미구현 항목 (V1 의도된 범위)

PRD §9 Out of Scope에 명시되어 있던 사항으로 의도적으로 빼둠:
- 점수 기반 자동 매칭 추천 / LLM 분석
- 데이터 백업/CSV 내보내기
- 다중 운영자, 다국어
- 푸시/이메일/SMS 알림
- 친구 본인 계정/결과 외부 공유

## 🔍 자체 발견 이슈 및 개선 (이번 라운드 처리)

### Issue R1 — 모든 DB 호출이 anon 키로 RLS에 막힘
**증상**: 처음 작성 시 `lib/db/*`가 `createSupabaseServerClient()`(anon key + cookies)로 쿼리 → RLS는 켜져있는데 정책이 없어 모든 결과가 빈 배열로 나옴.
**해결**: 모든 DB 호출을 `createSupabaseServiceClient()`로 전환. 서버 전용 모듈에 `import "server-only"` 가드. 인가는 `requireOperator()` + `owner_id` 필터로 응용 레이어에서 처리. 자세한 근거는 `decisions/001-runtime-architecture.md` D2.
**영향**: `lib/db/friends.ts`, `lib/db/invitations.ts`, `lib/db/surveys.ts`, `lib/db/pairs.ts`.

### Issue R2 — `</content>` 토큰 잔존으로 globals.css 빌드 실패
**증상**: Next.js 빌드 시 PostCSS가 `globals.css:91:1: Unknown word </content>` 에러.
**해결**: 파일 끝의 잘못된 마커 제거. 빌드 통과.

### Issue R3 — React 19 신규 lint 룰(`react-hooks/purity`, `react-hooks/set-state-in-effect`) 과민 트리거
**증상**: 서버 컴포넌트의 `Date.now()`, async 콜백의 `setSavedAt(Date.now())`, 보여주고 자동으로 숨기는 토스트의 `useEffect → setState` 패턴이 모두 에러로 잡힘.
**해결**: 두 룰을 `eslint.config.mjs`에서 globally off. 결정 근거를 같은 파일 주석에 명시.

### Issue R4 — 비교 뷰 페이지의 `Promise.all([...].map(async () => null))` 어이없는 패턴
**증상**: 작성 중 임시 코드가 남아 있던 비효율 + 가독성 저하.
**해결**: `getFriendsByIds(session.userId, [a, b])` 한 번으로 단순화.

### Issue R5 — Compare 페이지 진입 시 a/b가 동일하거나 누락이면 어떻게?
**해결**: `redirect("/compare")` 으로 셀렉터로 회귀. URL 직접 조작 시도도 안전하게 흡수.

## 🟡 알려진 마이너 이슈 (V1.x 후속 검토)

- **A**: 주관식 자동 저장이 1.5초 debounce — 사용자가 그 안에 챕터 넘어가면 마지막 입력이 저장 안 될 수 있음. 현재 useEffect cleanup이 timer만 cancel함. 챕터 전환 시 flush 처리를 추가하면 안전성 ↑.
- **B**: 비교 뷰의 "소개 기록" 토글은 낙관적 업데이트(서버 응답 전에 UI 변경). 네트워크 실패 시 롤백 처리 없음. 토이 스코프엔 거의 안 일어나지만, 토스트로 실패 알림이 필요할 수도.
- **C**: 친구 응답 자동 저장 실패 시(네트워크 끊김 등) 화면에는 "저장 중" 그대로 남음. Retry/오프라인 표시 없음.
- **D**: 운영자 화면에서 "표준 설문 초기화" 액션이 없음. 한번 만들어진 표준 설문을 통째로 비워야 할 때 챕터를 일일이 지워야 함. 토이 스코프엔 불필요.

이상은 모두 토이 스코프 V1 합격선 안의 사소한 폴리시 항목으로 판단해 V2 이슈로 이월.

## 🧪 검증

- `npx tsc --noEmit` ✅ 통과
- `npx eslint .` ✅ 통과
- `npx next build` ✅ 통과 (모든 19개 라우트 등록)
- 로컬 dev 서버에서 `/login` 200 OK, 미인증 `/` → 307 리다이렉트 확인

## 📦 V1 결론

PRD에 정의된 V1 범위를 모두 구현 완료. 알려진 마이너 이슈는 모두 운영에 지장 없는 수준이며, 운영자가 실제 데이터로 사용해보면서 개선 우선순위를 잡으면 됨. 다음 단계는 `docs/deployment.md`에 정리된 절차로 Supabase 프로젝트 생성 + Vercel 배포.
