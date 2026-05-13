/**
 * lib/auth/user.ts — 가입자 세션 헬퍼 단위 테스트.
 *
 * worker 가 작성할 모듈 인터페이스 가정:
 *
 *   export type UserSession = {
 *     authUserId: string;        // auth.users.id
 *     email: string;
 *     friendId: string;          // friends.id (auth_user_id 로 1:1 매핑)
 *     status: "pending" | "approved" | "rejected";
 *     onboardingStep: 1 | 2 | 3 | null;
 *   };
 *
 *   /** OAuth 세션 + friends row 가 있는 가입자만 돌려준다. 없으면 null. *\/
 *   export async function getCurrentUser(): Promise<UserSession | null>;
 *
 *   /** status='approved' 가입자가 아니면 적절한 라우트로 redirect. *\/
 *   export async function requireApprovedUser(): Promise<UserSession>;
 *
 *   /** 임의 friendId 가 현재 가입자 본인 row 인지 검증. 아니면 throw. *\/
 *   export async function assertOwnFriendRow(friendId: string): Promise<void>;
 *
 *   /** 운영자 화이트리스트 통과 여부 (가입자 측 액션의 운영자 우회 차단용). *\/
 *   export async function ensureNotOperator(): Promise<void>;
 *
 * Supabase 클라이언트는 mock 으로 격리.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// 모듈 전체를 mock — worker 가 실제 supabase server client 를 쓰는 구조 가정
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`__REDIRECT__:${to}`);
  }),
}));

// worker 가 작성할 모듈 — 아직 없으므로 import 자체가 빨갛게 실패
import {
  // @ts-expect-error worker 미작성
  getCurrentUser,
  // @ts-expect-error worker 미작성
  requireApprovedUser,
  // @ts-expect-error worker 미작성
  assertOwnFriendRow,
  // @ts-expect-error worker 미작성
  ensureNotOperator,
} from "@/lib/auth/user";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const sb = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.authUser },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: opts.friend, error: null }),
      single: vi
        .fn()
        .mockResolvedValue({ data: opts.friend, error: null }),
    })),
  };
  (createSupabaseServerClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(sb);
  return sb;
}

describe("lib/auth/user.ts — 가입자 세션 헬퍼", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPERATOR_EMAIL = "operator@gmail.com";
  });

  describe("getCurrentUser()", () => {
    it("OAuth 세션이 없으면 null 을 반환", async () => {
      mockSupabase({ authUser: null, friend: null });
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it("OAuth 세션은 있지만 friends row 가 없으면 null 을 반환", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: null,
      });
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it("OAuth + friends row 가 있으면 UserSession 을 반환", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "approved",
          onboarding_step: null,
        },
      });
      const result = await getCurrentUser();
      expect(result).toEqual({
        authUserId: "auth-1",
        email: "u1@gmail.com",
        friendId: "friend-1",
        status: "approved",
        onboardingStep: null,
      });
    });
  });

  describe("requireApprovedUser()", () => {
    it("status=approved 가입자는 그대로 반환", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "approved",
          onboarding_step: null,
        },
      });
      const result = await requireApprovedUser();
      expect(result.status).toBe("approved");
    });

    it("status=pending 가입자는 /pending 으로 redirect", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "pending",
          onboarding_step: null,
        },
      });
      await expect(requireApprovedUser()).rejects.toThrow(
        "__REDIRECT__:/pending",
      );
    });

    it("status=rejected 가입자는 /rejected 로 redirect", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "rejected",
          onboarding_step: null,
        },
      });
      await expect(requireApprovedUser()).rejects.toThrow(
        "__REDIRECT__:/rejected",
      );
    });

    it("OAuth 세션이 없으면 /signup 으로 redirect", async () => {
      mockSupabase({ authUser: null, friend: null });
      await expect(requireApprovedUser()).rejects.toThrow(
        "__REDIRECT__:/signup",
      );
    });

    it("friends row 가 없으면 /onboarding/profile 로 redirect", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: null,
      });
      await expect(requireApprovedUser()).rejects.toThrow(
        "__REDIRECT__:/onboarding/profile",
      );
    });
  });

  describe("assertOwnFriendRow()", () => {
    it("본인 friends row 면 통과", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "approved",
          onboarding_step: null,
        },
      });
      await expect(assertOwnFriendRow("friend-1")).resolves.toBeUndefined();
    });

    it("다른 사용자의 friends row 면 throw", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: {
          id: "friend-1",
          auth_user_id: "auth-1",
          status: "approved",
          onboarding_step: null,
        },
      });
      // friend-2 는 본인 row 가 아님
      await expect(assertOwnFriendRow("friend-2")).rejects.toThrow();
    });

    it("로그인 세션이 없으면 throw", async () => {
      mockSupabase({ authUser: null, friend: null });
      await expect(assertOwnFriendRow("friend-1")).rejects.toThrow();
    });
  });

  describe("ensureNotOperator() — 운영자 우회 차단", () => {
    it("OPERATOR_EMAIL 화이트리스트 미통과면 통과 (가입자)", async () => {
      mockSupabase({
        authUser: { id: "auth-1", email: "u1@gmail.com" },
        friend: null,
      });
      await expect(ensureNotOperator()).resolves.toBeUndefined();
    });

    it("OPERATOR_EMAIL 화이트리스트 통과한 운영자는 throw", async () => {
      mockSupabase({
        authUser: { id: "auth-op", email: "operator@gmail.com" },
        friend: null,
      });
      await expect(ensureNotOperator()).rejects.toThrow();
    });
  });
});
