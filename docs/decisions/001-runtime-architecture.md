# 001 — Runtime Architecture Decisions

> 인터뷰 종료 후 자율 결정. 코드를 짜면서 합의 없이 결정한 사항들이라 별도로 기록.

## D1. Next.js 16의 `proxy.ts` 사용 (구 middleware.ts)

**Decision**: 라우트 가드/세션 갱신을 `middleware.ts`가 아닌 `proxy.ts`로 구현.

**Why**: Next.js 16에서 `middleware`는 deprecated되고 `proxy`로 이름 변경됨. 본 프로젝트에서 설치된 Next.js 버전이 16.2.6이라 새 컨벤션을 따름.

**Affected files**: `proxy.ts`, `lib/supabase/proxy.ts`.

## D2. 모든 DB 쿼리는 service-role 클라이언트 사용

**Decision**: `lib/db/*.ts`의 모든 쿼리는 `createSupabaseServiceClient()`를 사용. 인증은 어플리케이션 레이어(`requireOperator`)에서 처리하고, RLS는 "anon/authenticated 모두 차단"으로 둠.

**Why**:
- 단일 운영자 모델에서 owner_id로 직접 필터링하면 충분
- 친구 측 페이지(/s/[token])는 anon 쿠키도 없는 비로그인 사용자가 접근 → 토큰 검증으로 인가
- RLS 정책을 토큰 기반으로 구현하려면 RPC 함수가 필요한데 단순 단일 운영자엔 오버킬
- service-role 키는 서버에서만 사용하고 브라우저로 절대 노출 안 함

**Trade-off**: RLS의 추가 안전망이 사라짐. 하지만 서버에서만 호출하는 lib/db/*에는 `import "server-only"`로 클라이언트 import 차단. owner_id 필터를 코드에서 일관되게 적용.

**Affected files**: `lib/db/friends.ts`, `lib/db/surveys.ts`, `lib/db/invitations.ts`, `lib/db/pairs.ts`, `lib/supabase/server.ts`.

## D3. Tailwind CSS 4 `@theme`로 디자인 토큰 정의

**Decision**: shadcn/ui의 CSS 변수 시스템 대신, 더 단순하게 `@theme` 블록에 직접 토큰을 정의. `--color-fg`, `--color-pink-500` 등.

**Why**: shadcn/ui CLI는 인터랙티브 프롬프트가 있어 자율 모드에 부적합. 또한 토이 스코프엔 직접 작성한 미니 컴포넌트(Button, Input, Card, Badge, EmptyState)면 충분.

**Affected files**: `app/globals.css`, `components/ui/*.tsx`.

## D4. Pair 엔티티의 friend_a_id < friend_b_id 정렬

**Decision**: pairs 테이블에 CHECK 제약으로 `friend_a_id < friend_b_id` 강제. 모든 pair 조회/생성 시 `pairKey()`로 정렬.

**Why**: 한 쌍당 1행만 존재하도록 강제. (a,b)와 (b,a)가 두 행으로 존재하는 버그 방지.

**Affected files**: `supabase/migrations/0001_init.sql`, `lib/utils.ts:pairKey`, `lib/db/pairs.ts`.

## D5. Survey 옵션을 jsonb 단일 컬럼으로 저장

**Decision**: `survey_questions.options` 컬럼을 jsonb로 두고 type별로 다른 스키마 저장.
- `mcq_single`/`mcq_multi`/`ranking` → `string[]`
- `likert` → `{min, max, minLabel?, maxLabel?}`
- `text` → `null`

**Why**: 정규화하면 type별 별도 테이블이 4개 더 필요. 토이 스코프엔 과함. 검증은 어플리케이션 레이어에서.

**Affected files**: `supabase/migrations/0001_init.sql`, `lib/types/domain.ts`, `components/operator/survey-editor.tsx`.

## D6. 표준 설문은 owner당 1개로 강제 (UNIQUE INDEX)

**Decision**: `surveys`에 partial unique index `WHERE type='standard' AND is_active=true`. `ensureStandardSurvey()`로 없으면 빈 표준 설문 자동 생성.

**Why**: 표준 설문 = "모두에게 공통". 운영자가 실수로 여러 개 만드는 사태 방지.

**Affected files**: `supabase/migrations/0001_init.sql`, `lib/db/surveys.ts`.

## D7. 자동 저장 — 객관식/Likert/우선순위 즉시, 주관식 1.5초 debounce

**Decision**: `chapter-runner.tsx`의 `setAnswer()`에서 question.type === "text"일 때만 1.5초 debounce, 나머지는 즉시 저장.

**Why**: PRD §6.2 합의 사항. 텍스트 입력 키스트로크마다 호출하면 서버 부담 ↑ 및 깜빡임. 객관식은 어차피 클릭 한 번이라 즉시 저장이 쾌적.

**Affected files**: `app/s/[token]/[chapter]/chapter-runner.tsx`.

## D8. Drag-and-Drop 대신 ▲▼ 버튼으로 Ranking 구현

**Decision**: 우선순위(랭킹) 문항의 정렬을 `dnd-kit` 같은 라이브러리 없이 ▲/▼ 버튼으로 구현.

**Why**: 토이 스코프 + 모바일에서 드래그는 스크롤과 충돌하기 쉬움. 버튼이 더 단순하고 안정적.

**Affected files**: `app/s/[token]/[chapter]/chapter-runner.tsx:RankingInput`.

## D9. 비교 뷰의 자동 하이라이트 색상 기준

**Decision**: `compareValues()` 함수로 type별 비교:
- `mcq_single`/`text`: 같으면 same, 다르면 different
- `likert`: 같으면 same, 차 1 이내면 partial, 그 이상이면 different
- `mcq_multi`: Jaccard 유사도 (1=same, 0=different, 그 외 partial)
- `ranking`: 위치 일치 비율 (1=same, 0=different, 그 외 partial)

**Why**: PRD에서 "점수 없음, 시각적 단서만". 단순한 휴리스틱으로 충분. partial 케이스 도입 → "음 비슷하긴 함" 시각화.

**Affected files**: `app/(operator)/compare/compare-view.tsx`.

## D10. 친구 카드 프로필 완성도 가중치

**Decision**: Tier 1=30, Tier 2=40, Tier 3=20, 상태=10. 합 100.

**Why**: 등록 직후도 0이 아니라 30%부터 시작해서 운영자가 보강 동기를 갖게 함. Tier 2가 가장 큰 비중인 이유는 매칭에 실용적인 정보(나이/지역/직업/친밀도)가 모두 여기 있어서.

**Affected files**: `lib/db/friends.ts:profileCompletion`.

## D11. Custom Survey 응답은 자동 합치지 않음 (D'15와 일관)

**Decision**: 커스텀 설문 응답은 별도 invitation으로 저장되며, 친구 상세 페이지의 "발송 이력"에 표시되지만 프로필 메모/태그로 자동 병합되지 않음.

**Why**: 인터뷰에서 결정된 사항. "운영자가 직접 포맷 꾸며서 넣을 수 있으니 그렇게 둬도 될거고."

**Affected files**: `app/(operator)/friends/[id]/page.tsx`(이력 표시), 이후 추가 UI는 미구현.

## D12. 토큰은 32자 영숫자 (nanoid customAlphabet)

**Decision**: `0-9A-Za-z` 알파벳에서 32자 무작위. URL-safe, 약 190비트 엔트로피.

**Why**: 추측 어려움 + URL에 그대로 박아도 깔끔.

**Affected files**: `lib/utils.ts:newSurveyToken`.

## D13. 발송 페이지에서 "표준 설문이 비어 있을 때" 가드

**Decision**: 표준 설문에 챕터/문항이 없으면 발송 페이지의 표준 옵션이 disabled + 경고 표시.

**Why**: 친구가 빈 설문 받으면 부정적 경험. 운영자가 먼저 편집을 끝내도록 유도.

**Affected files**: `app/(operator)/send/send-form.tsx`.

## D14. 친구 측 "이어풀기"는 첫 미답 챕터로 점프

**Decision**: `/s/[token]` 랜딩에서 "이어서 시작" 시 첫 미답 문항이 있는 챕터로 라우팅. 모든 챕터에 답이 있으면 마지막 챕터로 보내 제출 버튼 노출.

**Why**: 친구가 매번 첫 챕터부터 다시 보지 않게. 이미 답한 챕터는 건너뛰어 부담 ↓.

**Affected files**: `app/s/[token]/page.tsx`.
