# 015-light-dark-theme: 라이트/다크 테마 전환 (기본 라이트)

> 작성: 2026-05-28  /  작성자: Lead 에이전트
> 관련 작업: feature/theme-toggle

## 배경

지금까지 앱은 **다크 전용**이었다 (`app/globals.css @theme` 에 다크 값만, `:root { color-scheme: dark }`). 사용자가 "기본은 라이트, 토글로 다크 전환, 전체 컬러를 라이트/다크 모두 가능하게" 를 요청했다.

색은 이미 `var(--color-*)` 토큰으로 거의 완전히 추상화돼 있어 (하드코딩 색은 `button.tsx` hover `#23232b`, `layout.tsx` themeColor 2곳뿐) 토큰 값만 테마별로 갈아끼우면 전 컴포넌트가 따라온다.

## 결정

1. **기본 = 라이트, 다크는 `.dark` 클래스 오버라이드.** `@theme` 의 토큰 값을 라이트 기본값으로 재정의하고, `html.dark` 일 때만 발화하는 `.dark { … }` 블록에서 기존 다크 값으로 오버라이드. `:root { color-scheme: light }` / `.dark { color-scheme: dark }`.

2. **핑크 스케일의 명도를 테마별로 뒤집는다 (비자명).** 코드베이스 조사 결과 핑크 토큰의 쓰임이 깔끔히 갈려 있었다:
   - `pink-100~400` → **텍스트 액센트 전용** (`text-pink-*` 는 최대 400)
   - `pink-500/600` → **채움(bg)·보더·링 전용** (`bg/border/ring-pink-*` 는 최소 500)

   텍스트 스텝은 "어두운 배경 위 밝은 핑크" 로 튜닝돼 있어 라이트 배경에선 그대로 두면 연핑크/흰 배경 위에서 거의 안 보인다. 그래서 **라이트에선 텍스트 스텝(100~400)을 진한 핑크로**, **다크(.dark)에선 밝은 핑크로** 둔다. 채움 스텝(500/600)은 흰 글자를 얹는 브랜드 버튼이라 양 테마 공통(오버라이드 X).
   → 이 분리 덕에 **컴포넌트 40여 곳을 한 줄도 안 건드리고** 라이트 가독성을 토큰만으로 확보.

3. **쿠키 기반 무(無)깜빡임 초기화.** 토글이 `theme` 쿠키(1년, SameSite=Lax)에 값을 쓰고, 루트 레이아웃(`app/layout.tsx`)이 `await cookies()` 로 읽어 SSR 단계에서 `<html>` 에 `dark` 클래스를 미리 박는다. 인라인 스크립트 + localStorage 방식의 FOUC 가 없다.

4. **아이콘 전환은 React state 가 아니라 `.dark` 셀렉터 기반 CSS** (`globals.css` 의 `.theme-toggle-sun/-moon`). 서버/클라이언트 마크업이 항상 동일해 hydration mismatch 가 원천 차단된다. 토글 자체는 DOM(`classList.toggle`) + 쿠키만 만지는 무상태 클라이언트 컴포넌트.

5. **토글 배치** — 운영자 nav(데스크톱 우측 + 모바일 헤더의 햄버거 옆 상시 노출), 가입자 `UserShell`(우상단 absolute), `/login`(우상단 absolute).

6. **`--color-surface-hover` 토큰 신설** — 기존 하드코딩 `secondary` 버튼 hover `#23232b`(다크에선 surface-2 보다 밝게) 를 토큰화. 라이트에선 반대로 더 어둡게(`#e8e8ec`).

7. **워크플로우: `/work` 경량 경로** (Lead 단독, TDD·팀·peer 생략). 새 라우트/Server Action/마이그레이션/인증·인가/데이터 모델 변경이 전혀 없는 순수 시각 변경 + 무상태 토글이라 CLAUDE.md §10 경량 판정 5조건을 모두 충족. 회귀 차단은 lint + build 로 충분.

## 근거

- 토큰 추상화가 이미 충분해 "값 교체" 만으로 전역 전환이 성립 → 컴포넌트 변경 최소화가 가장 안전하고 회귀가 적다.
- 핑크 텍스트/채움 분리는 코드 조사로 *실측*한 불변식이라, 스케일 반전이 안전하다고 판단 (`globals.css` 주석 + 본 로그에 명문화해 미래 회귀 방지).
- 쿠키 방식은 미들웨어가 어차피 매 요청 도는 앱이라 동적 렌더 비용이 무시 가능하고, 인라인 스크립트보다 SSR 정합성이 깔끔.
- 검증: `npm run lint` 통과, `next build` 컴파일 성공(타입 에러는 `playwright.config.ts`/`vitest.config.ts` 의 미설치 dev dep 2건뿐 — **본 변경과 무관한 로컬 env gap**, 내가 만진 파일은 tsc 0 에러). 컴파일된 CSS 에 라이트 `#fafafa` + `.dark{ … #0a0a0b }` 동시 존재 확인. 쿠키 유무에 따른 `<html class="… dark">` SSR 분기를 dev 서버 curl 로 확인.

## 거절된 대안

- **localStorage + `<head>` 인라인 스크립트** — FOUC 방지는 되지만 스크립트 주입 + `suppressHydrationWarning` 만으로 처리해야 하고 SSR 이 테마를 모른다. 쿠키 방식이 더 깔끔.
- **`prefers-color-scheme` 미디어쿼리로 다크 발화** — 사용자가 "기본 라이트 + 명시적 토글" 을 원했고, OS 설정 추종은 요구사항과 어긋남. (단 토큰 구조는 추후 `@media` 추가가 쉬운 형태)
- **시맨틱 액센트 토큰 신설(`--color-accent-text`/`-fill`) 후 컴포넌트 마이그레이션** — 가장 "정석" 이지만 40여 컴포넌트 줄을 건드려 회귀 표면이 커진다. 경량 변경 취지에 안 맞아 보류 (핑크 스케일 반전으로 동일 효과를 무변경으로 달성).
- **`dark:` Tailwind variant 도입(`@custom-variant`)** — 현재 코드는 `var()` 직접 참조라 불필요. 아이콘 전환도 커스텀 CSS 로 충분해 YAGNI.

## 후속 영향

- 앞으로 새 컴포넌트는 `var(--color-*)` 토큰만 쓰면 자동으로 양 테마 대응. 핑크를 **텍스트**로 쓰면 `pink-100~400`, **채움/보더**로 쓰면 `pink-500/600` 규칙을 지켜야 라이트 가독성이 유지된다 (globals.css 주석 참고).
- CLAUDE.md §5(디자인 시스템)의 "Black base + Pink accent 다크 톤" 서술은 이제 "라이트 기본 + 다크 토글" 로 바뀌었으므로 본 PR 에서 동기화.
- 친구 측 `.user-shell` 핑크 그라데이션은 `var(--color-bg)` 기반이라 라이트에선 흰 바탕 위 부드러운 핑크 워시로 자연 전환된다.
