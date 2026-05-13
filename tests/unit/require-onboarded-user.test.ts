/**
 * lib/auth/user.ts — `requireOnboardedUser()` 신설 함수 단위 테스트 (011 §D2).
 *
 * 배경: `/me/*` 페이지·actions 는 011 이전엔 `requireApprovedUser()` 를 호출해
 *   status='pending' 가입자를 `/pending` 으로 강제 redirect 했다 (011 시점 회고).
 *   011 작업은 온보딩을 마친 pending 가입자에게도 `/me/*` 를 열어주기로 결정 (D1)
 *   했고, 페이지 레벨 게이트도 함께 풀어야 한다 (D2 — 가드만 풀면 페이지가 막아서
 *   무한 redirect 회귀).
 *
 *   013 후속 (docs/decisions/013-pending-deprecation.md): `/pending` 라우트 자체가
 *   폐기되어 pending+step=null 가입자의 본거지는 이제 `/me` 단일. 본 함수의 통과
 *   조건은 011 그대로 유지 — pending+null 도 /me/* 통과.
 *
 * 신설 함수 인터페이스 (worker 가 채울 모듈):
 *
 *   export async function requireOnboardedUser(): Promise<UserSession>;
 *
 * 통과 조건:
 *   - OAuth 세션 있음
 *   - friends row 있음
 *   - status === "approved"  ← 기존 requireApprovedUser 와 같은 분기
 *     또는 (status === "pending" 이면서 onboarding_step == null)  ← 011 NEW
 *
 * 그 외 redirect 대상:
 *   - 비로그인 → /login (010 §D1 통합 진입점)
 *   - friends row 없음 → /onboarding/profile
 *   - pending + step != null → resolveOnboardingResumeTarget(...) (이어풀기)
 *   - rejected → /rejected
 *
 * Supabase 클라이언트는 mock 으로 격리 — 동일 패턴은 tests/unit/auth-user.test.ts.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`__REDIRECT__:${to}`);
  }),
}));

// worker 가 작성할 모듈 — 아직 export 되지 않았으므로 import 자체가 빨갛게 실패해야 정상
import {
  // @ts-expect-error worker 미작성 (011 §D2)
  requireOnboardedUser,
} from "@/lib/auth/user";

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

type Friend = {
  id: string;
  auth_user_id: string;
  status: "pending" | "approved" | "rejected";
  onboarding_step: 1 | 2 | 3 | null;
};

function mockSupabase(opts: {
  authUser: { id: string; email: string } | null;
  friend: Friend | null;
}) {
  const fromBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: opts.friend, error: null }),
    single: vi
      .fn()
      .mockResolvedValue({ data: opts.friend, error: null }),
  };
  const serverSb = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.authUser },
        error: null,
      }),
    },
    from: vi.fn(() => fromBuilder),
  };
  const serviceSb = {
    from: vi.fn(() => fromBuilder),
  };
  (
    createSupabaseServerClient as unknown as ReturnType<typeof vi.fn>
  ).mockResolvedValue(serverSb);
  (
    createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>
  ).mockReturnValue(serviceSb);
  return { serverSb, serviceSb };
}

describe("requireOnboardedUser() — 011 §D2 (가입자 /me/* 게이트)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPERATOR_EMAIL = "operator@gmail.com";
  });

  describe("통과 케이스", () => {
    it("status=approved + step=null 가입자는 UserSession 그대로 반환", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "approved",
          onboarding_step: null,
        },
      });
      const result = await requireOnboardedUser();
      expect(result.status).toBe("approved");
      expect(result.friendId).toBe("friend-1");
    });

    it("status=pending + step=null (심사 대기 중인 온보딩 완료 사용자) 는 통과 — 011 NEW", async () => {
      mockSupabase({
        authUser: { id: "auth-2", email: "u2@gmail.com" },
        friend: {
          id: "friend-2",
          auth_user_id: "auth-2",
          status: "pending",
          onboarding_step: null,
        },
      });
      const result = await requireOnboardedUser();
      expect(result.status).toBe("pending");
      expect(result.onboardingStep).toBeNull();
      expect(result.friendId).toBe("friend-2");
    });
  });

  describe("redirect 케이스", () => {
    it("비로그인 → /login (010 §D1 통합 진입점)", async () => {
      mockSupabase({ authUser: null, friend: null });
      await expect(requireOnboardedUser()).rejects.toThrow(
        "__REDIRECT__:/login",
      );
    });

    it("OAuth 있고 friends row 없음 → /onboarding/profile", async () => {
      mockSupabase({
        authUser: { id: "auth-3", email: "u3@gmail.com" },
        friend: null,
      });
      await expect(requireOnboardedUser()).rejects.toThrow(
        "__REDIRECT__:/onboarding/profile",
      );
    });

    it("status=pending + step=1 → /onboarding/profile (이어풀기)", async () => {
      mockSupabase({
        authUser: { id: "auth-4", email: "u4@gmail.com" },
        friend: {
          id: "friend-4",
          auth_user_id: "auth-4",
          status: "pending",
          onboarding_step: 1,
        },
      });
      await expect(requireOnboardedUser()).rejects.toThrow(
        "__REDIRECT__:/onboarding/profile",
      );
    });

    it("status=pending + step=2 → /onboarding/preferences (이어풀기)", async () => {
      mockSupabase({
        authUser: { id: "auth-5", email: "u5@gmail.com" },
        friend: {
          id: "friend-5",
          auth_user_id: "auth-5",
          status: "pending",
          onboarding_step: 2,
        },
      });
      await expect(requireOnboardedUser()).rejects.toThrow(
        "__REDIRECT__:/onboarding/preferences",
      );
    });

    it("status=pending + step=3 → /onboarding/survey (이어풀기)", async () => {
      mockSupabase({
        authUser: { id: "auth-6", email: "u6@gmail.com" },
        friend: {
          id: "friend-6",
          auth_user_id: "auth-6",
          status: "pending",
          onboarding_step: 3,
        },
      });
      await expect(requireOnboardedUser()).rejects.toThrow(
        "__REDIRECT__:/onboarding/survey",
      );
    });

    it("status=rejected → /rejected", async () => {
      mockSupabase({
        authUser: { id: "auth-7", email: "u7@gmail.com" },
        friend: {
          id: "friend-7",
          auth_user_id: "auth-7",
          status: "rejected",
          onboarding_step: null,
        },
      });
      await expect(requireOnboardedUser()).rejects.toThrow(
        "__REDIRECT__:/rejected",
      );
    });
  });
});
