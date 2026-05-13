import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Whitelist of operator emails. The OPERATOR_EMAIL env var accepts either a
 * single email or a comma-separated list. Multiple operators share one site
 * display name AND one fixed site owner_id — they collaborate on the same
 * data (friends/surveys/pairs). The auth user id of whoever logged in is
 * intentionally not used as owner_id.
 */
const OPERATOR_EMAILS: string[] = (process.env.OPERATOR_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const OPERATOR_DISPLAY_NAME =
  process.env.OPERATOR_DISPLAY_NAME ?? "운영자";

/**
 * Fixed site-wide owner_id. Every whitelisted operator's session resolves
 * to this same id, so they all read/write the same dataset. Hardcoded
 * because the site is single-tenant by design (multi-tenant SaaS is
 * explicitly out of V1 scope).
 */
export const SITE_OWNER_ID = "11111111-1111-1111-1111-111111111111";

export type OperatorSession = {
  /** Site-wide owner_id, identical across all operators. */
  userId: string;
  email: string;
  displayName: string;
};

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

  return {
    userId: SITE_OWNER_ID,
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
