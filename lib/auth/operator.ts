import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

/**
 * Whitelist of operator emails. The OPERATOR_EMAIL env var accepts either a
 * single email or a comma-separated list. Multiple operators share one site
 * display name (OPERATOR_DISPLAY_NAME) AND one logical site owner_id — they
 * collaborate on the same data (friends/surveys/pairs).
 */
const OPERATOR_EMAILS: string[] = (process.env.OPERATOR_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const OPERATOR_DISPLAY_NAME =
  process.env.OPERATOR_DISPLAY_NAME ?? "운영자";

export type OperatorSession = {
  /**
   * Logical site owner_id. Identical across every whitelisted operator so
   * they share data. Lazily initialized on the first operator's sign-in.
   */
  userId: string;
  /** Auth-level user id of the currently logged-in operator. */
  authUserId: string;
  email: string;
  displayName: string;
};

/**
 * Resolve the shared site owner_id, initializing it on first use to the
 * current operator's auth.users.id. Subsequent operators get the same id.
 */
async function getOrInitSiteOwnerId(currentUserId: string): Promise<string> {
  const sb = createSupabaseServiceClient();
  const { data: existing, error: readErr } = await sb
    .from("site_owner")
    .select("user_id")
    .eq("id", 1)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing?.user_id) return existing.user_id as string;

  const { error: insErr } = await sb
    .from("site_owner")
    .insert({ id: 1, user_id: currentUserId });
  if (insErr) {
    // Likely a race with another operator's first request. Re-read.
    const { data: again } = await sb
      .from("site_owner")
      .select("user_id")
      .eq("id", 1)
      .maybeSingle();
    return (again?.user_id as string | undefined) ?? currentUserId;
  }
  return currentUserId;
}

/**
 * Returns null if the current session does not belong to a whitelisted operator.
 * Use this in pages/Server Actions that need to verify operator authorization.
 */
export async function getOperatorOrNull(): Promise<OperatorSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (!isOperatorEmail(user.email)) return null;

  const sharedOwnerId = await getOrInitSiteOwnerId(user.id);

  return {
    userId: sharedOwnerId,
    authUserId: user.id,
    email: user.email,
    displayName: OPERATOR_DISPLAY_NAME,
  };
}

/**
 * Throws (via redirect) if the user is not a whitelisted operator.
 * Use at the top of operator pages or server actions.
 */
export async function requireOperator(): Promise<OperatorSession> {
  const session = await getOperatorOrNull();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (OPERATOR_EMAILS.length === 0) return false;
  return OPERATOR_EMAILS.includes(email.toLowerCase().trim());
}
