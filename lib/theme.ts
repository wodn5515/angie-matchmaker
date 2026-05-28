/**
 * 테마 쿠키 이름. 값은 "dark" | "light" (없으면 라이트 = 기본).
 *
 * server(루트 레이아웃의 SSR 초기 적용)와 client(ThemeToggle 의 토글)가 이 한 출처를
 * 참조하도록 server-free 모듈로 분리한다 (`next/headers` 등 서버 전용 import 없음).
 */
export const THEME_COOKIE = "theme";
