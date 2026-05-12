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
