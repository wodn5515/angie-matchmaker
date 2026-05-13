import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 가입자(Self-signup user) 세션 헬퍼.
 *
 * PRD §2.2 + §5.5 — `auth.users` × `friends.auth_user_id` 1:1 매핑.
 * Server Component / Server Action 에서 사용.
 *
 * 운영자(`OPERATOR_EMAIL` 화이트리스트 통과 계정) 세션은 여기서 다루지 않는다.
 * 운영자는 `lib/auth/operator.ts` 의 `requireOperator()` 를 쓴다.
 */

export type UserSession = {
  /** auth.users.id */
  authUserId: string;
  email: string;
  /** friends.id (auth_user_id 와 1:1 매핑) */
  friendId: string;
  status: "pending" | "approved" | "rejected";
  onboardingStep: 1 | 2 | 3 | null;
};

type FriendRow = {
  id: string;
  auth_user_id: string;
  status: "pending" | "approved" | "rejected";
  onboarding_step: 1 | 2 | 3 | null;
};

/**
 * 운영자 화이트리스트를 호출 시점에 다시 읽는다.
 * 모듈 로드 시점 캐싱(`lib/auth/operator.ts`) 과 다르게 — 환경변수 stub 이 잦은
 * 테스트 환경에서도 일관된 동작을 보장한다.
 */
function readOperatorEmailsAtCall(): string[] {
  return (process.env.OPERATOR_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isOperatorEmailAtCall(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = readOperatorEmailsAtCall();
  if (list.length === 0) return false;
  return list.includes(email.toLowerCase().trim());
}

async function loadAuthUser(): Promise<{ id: string; email: string } | null> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? "" };
}

async function loadOwnFriendRow(authUserId: string): Promise<FriendRow | null> {
  const sb = await createSupabaseServerClient();
  const { data } = await sb
    .from("friends")
    .select("id, auth_user_id, status, onboarding_step")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return (data as FriendRow | null) ?? null;
}

/**
 * OAuth 세션 + friends row 가 모두 있는 가입자만 UserSession 으로 돌려준다.
 * 없으면 null. 운영자 세션의 경우에도 friends row 가 없으므로 null 반환.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const authUser = await loadAuthUser();
  if (!authUser) return null;
  const friend = await loadOwnFriendRow(authUser.id);
  if (!friend) return null;
  return {
    authUserId: authUser.id,
    email: authUser.email,
    friendId: friend.id,
    status: friend.status,
    onboardingStep: friend.onboarding_step,
  };
}

/**
 * status='approved' 가입자만 통과. 다른 상태면 적절한 라우트로 redirect.
 *
 * - 비로그인 → /signup
 * - friends row 없음 → /onboarding/profile
 * - status='pending' → /pending
 * - status='rejected' → /rejected
 */
export async function requireApprovedUser(): Promise<UserSession> {
  const authUser = await loadAuthUser();
  if (!authUser) {
    redirect("/signup");
  }
  const friend = await loadOwnFriendRow(authUser.id);
  if (!friend) {
    redirect("/onboarding/profile");
  }
  if (friend.status === "pending") redirect("/pending");
  if (friend.status === "rejected") redirect("/rejected");
  return {
    authUserId: authUser.id,
    email: authUser.email,
    friendId: friend.id,
    status: friend.status,
    onboardingStep: friend.onboarding_step,
  };
}

/**
 * 임의 friendId 가 현재 가입자 본인 row 인지 검증. 본인이 아니면 throw.
 *
 * Server Action 에서 가입자가 보낸 friendId (예: 폼 hidden field) 를 신뢰하기 전에
 * 호출해 우회 차단. 운영자는 본 메서드를 사용하지 않는다 (운영자는 `requireOperator()`).
 */
export async function assertOwnFriendRow(friendId: string): Promise<void> {
  const authUser = await loadAuthUser();
  if (!authUser) {
    throw new Error("자가 가입자 세션이 없습니다");
  }
  const friend = await loadOwnFriendRow(authUser.id);
  if (!friend || friend.id !== friendId) {
    throw new Error("본인의 가입자 row 가 아닙니다");
  }
}

/**
 * 가입자 측 Server Action 에서 운영자 우회를 차단.
 * 운영자가 `auth.users` 세션을 갖고 가입자 페이지의 form action 을 호출할 경우 throw.
 */
export async function ensureNotOperator(): Promise<void> {
  const authUser = await loadAuthUser();
  if (!authUser?.email) return;
  if (isOperatorEmailAtCall(authUser.email)) {
    throw new Error("운영자는 가입자 액션을 수행할 수 없습니다");
  }
}
