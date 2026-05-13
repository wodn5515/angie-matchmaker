/**
 * 온보딩 이어풀기 통합 테스트.
 *
 * PRD §3.1.2: 가입 도중 이탈 후 다시 진입 → `onboarding_step` 으로 마지막 단계부터 이어 풀기.
 *
 * 시나리오:
 *   - Step 1 완료 시점에 friends row 생성 (status='pending', onboarding_step=2)
 *   - Step 2 skip 시 onboarding_step=3
 *   - Step 3 skip 또는 완료 시 onboarding_step=null (모두 끝)
 *   - 각 시점에 재진입 (/me 진입) → proxy 가드가 다음 단계로 자동 라우팅
 *
 * 구현 가정 (worker 가 채울 모듈):
 *   import { resolveOnboardingResumeTarget } from "@/lib/auth/onboarding";
 *
 *   type OnboardingResumeInput = {
 *     friend: { status: "pending" | "approved" | "rejected"; onboarding_step: 1 | 2 | 3 | null } | null;
 *   };
 *
 *   /** 가입 흐름의 적절한 다음 단계 path 를 반환. 끝났으면 null. *\/
 *   function resolveOnboardingResumeTarget(input: OnboardingResumeInput): string | null;
 *
 * `proxy.ts` 가드도 결국 이 헬퍼를 호출하는 형태로 가정 — 단위 테스트와 별개로
 * 이어풀기 결정 로직만 통합 spec 으로 격리.
 */

import { describe, expect, it } from "vitest";
// @ts-expect-error worker 미작성
import { resolveOnboardingResumeTarget } from "@/lib/auth/onboarding";

describe("온보딩 이어풀기 — onboarding_step 으로 다음 단계 라우팅", () => {
  it("friends row 가 없으면 /onboarding/profile (Step 1) 로 시작", () => {
    const target = resolveOnboardingResumeTarget({ friend: null });
    expect(target).toBe("/onboarding/profile");
  });

  it("Step 1 완료 후 (step=2) → /onboarding/preferences 로 이어풀기", () => {
    const target = resolveOnboardingResumeTarget({
      friend: { status: "pending", onboarding_step: 2 },
    });
    expect(target).toBe("/onboarding/preferences");
  });

  it("Step 2 skip 또는 완료 후 (step=3) → /onboarding/survey 로 이어풀기", () => {
    const target = resolveOnboardingResumeTarget({
      friend: { status: "pending", onboarding_step: 3 },
    });
    expect(target).toBe("/onboarding/survey");
  });

  it("Step 3 skip/완료 (step=null, status=pending) → null (온보딩 끝, /pending 으로)", () => {
    const target = resolveOnboardingResumeTarget({
      friend: { status: "pending", onboarding_step: null },
    });
    expect(target).toBeNull();
  });

  it("승인된 가입자 (status=approved) → null (온보딩 더 이상 의미 없음)", () => {
    const target = resolveOnboardingResumeTarget({
      friend: { status: "approved", onboarding_step: null },
    });
    expect(target).toBeNull();
  });

  it("거절된 가입자 (status=rejected) → null", () => {
    const target = resolveOnboardingResumeTarget({
      friend: { status: "rejected", onboarding_step: null },
    });
    expect(target).toBeNull();
  });
});
