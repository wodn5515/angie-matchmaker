import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function classifyAge(birthYear: number | null | undefined) {
  if (!birthYear) return null;
  const age = new Date().getFullYear() - birthYear + 1; // Korean age-ish
  return age;
}

/** Sort two friend ids canonically (smaller first) for Pair lookup. */
export function pairKey(a: string, b: string): { aid: string; bid: string } {
  return a < b ? { aid: a, bid: b } : { aid: b, bid: a };
}

/**
 * 인스타그램 입력값에서 핸들만 추출.
 * 허용 입력 형태:
 *   - `gildong` / `@gildong`
 *   - `instagram.com/gildong` / `https://www.instagram.com/gildong/`
 *   - 쿼리스트링·trailing slash 모두 흡수
 * 인스타 핸들 규칙(영문/숫자/점/언더스코어, 30자 이내)을 위반하는 입력은 `null`.
 */
export function instagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/)?@?([a-zA-Z0-9._]{1,30})\/?(?:[?#].*)?$/,
  );
  return m ? m[1] : null;
}

/**
 * 가입자 instagram 입력값 → 새 탭으로 열 외부 URL. 핸들 추출 실패 시 `null`
 * (호출처가 일반 텍스트로 fallback 표시 가능).
 */
export function instagramUrl(raw: string | null | undefined): string | null {
  const handle = instagramHandle(raw);
  return handle ? `https://www.instagram.com/${handle}/` : null;
}
