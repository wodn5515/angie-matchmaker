/**
 * 가입자 온보딩 이어풀기 — 마지막으로 도달한 단계로 라우팅.
 *
 * PRD §3.1.2 — 가입 도중 이탈 후 재진입 시 `onboarding_step` 으로 이어 풀기.
 *
 * 의미:
 *   - `null friend` → /onboarding/profile (Step 1 시작)
 *   - `pending + step=1` → /onboarding/profile (Step 1 진행 중)
 *   - `pending + step=2` → /onboarding/preferences (Step 1 완료, Step 2 진행 중)
 *   - `pending + step=3` → /onboarding/survey (Step 2 까지 완료, Step 3 진행 중)
 *   - `pending + step=null` → 온보딩 종료, 운영자 심사 대기 → null (013 §D1 후 호출 측이 /me 분기)
 *   - `approved | rejected` → null (온보딩 더 이상 의미 없음)
 */
export type OnboardingFriend = {
  status: "pending" | "approved" | "rejected";
  onboarding_step: 1 | 2 | 3 | null;
};

export type OnboardingResumeInput = {
  friend: OnboardingFriend | null;
};

export function resolveOnboardingResumeTarget(
  input: OnboardingResumeInput,
): string | null {
  const { friend } = input;
  if (!friend) return "/onboarding/profile";
  if (friend.status !== "pending") return null;
  switch (friend.onboarding_step) {
    case 1:
      return "/onboarding/profile";
    case 2:
      return "/onboarding/preferences";
    case 3:
      return "/onboarding/survey";
    case null:
      return null;
    default:
      return null;
  }
}
