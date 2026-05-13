-- 0005_friends_self_traits.sql — 본인 프로필 4 항목 추가 (이상형 매칭 대칭 회복)
-- 결정 로그: docs/decisions/009-v2-self-traits.md
--
-- ## 배경
--
-- V2 이상형 (선호 4 항목 — smoking/drinking/marriage_timing/tattoo) 은 도입됐지만
-- 본인 프로필 (friends.*) 에는 대응 컬럼이 없어 비교 뷰의 4 항목이 항상 neutral 로
-- 떨어졌다. 운영자 보고 "이상형 vs 본인" 비교가 한 방향만 작동.
-- 본 마이그레이션은 friends 에 자기 보고 4 컬럼을 추가해 양방향 매칭을 활성화한다.
-- (1:1 이상형 테이블 정의는 본 파일에서 만지지 않는다 — 0003 의 정의가 그대로 유지.)
--
-- ## enum 셋 — 이상형의 "상관없음 제외" + 자세함 ↑
--
-- 이상형 enum (any/non_smoker_only 등) 은 "이상형 측 표현" (상관없는지 여부 + 선호 값)
-- 이고, 본인 프로필 enum 은 "자기 상태" (실제 행위). 셋이 의미적으로 다르므로
-- 본인 쪽은 별 enum 으로 정의한다.
--
--   smoking:        non_smoker / occasional / regular
--   drinking:       non_drinker / sometimes / often
--   marriage_view:  within_2y / over_3y / dating_focus
--   tattoo:         none / small / large
--
-- 모두 nullable — 권장 입력 정책 (PRD §3.1.2). 빈 채로 가입 가능.

------------------------------------------------------------------
-- friends 에 자기 보고 4 컬럼 추가 (모두 nullable + CHECK)
------------------------------------------------------------------

alter table friends add column smoking text
  check (smoking is null or smoking in ('non_smoker','occasional','regular'));

alter table friends add column drinking text
  check (drinking is null or drinking in ('non_drinker','sometimes','often'));

alter table friends add column marriage_view text
  check (marriage_view is null or marriage_view in ('within_2y','over_3y','dating_focus'));

alter table friends add column tattoo text
  check (tattoo is null or tattoo in ('none','small','large'));
