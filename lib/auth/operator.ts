import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL?.toLowerCase().trim();
export const OPERATOR_DISPLAY_NAME =
  process.env.OPERATOR_DISPLAY_NAME ?? "운영자";

export type OperatorSession = {
  userId: string;
  email: string;
  displayName: string;
};

/**
 * Returns null if the current session does not belong to the whitelisted operator.
 * Use this in pages/Server Actions that need to verify operator authorization.
 */
export async function getOperatorOrNull(): Promise<OperatorSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (!OPERATOR_EMAIL) return null;
  if (user.email.toLowerCase().trim() !== OPERATOR_EMAIL) return null;

  return {
    userId: user.id,
    email: user.email,
    displayName: OPERATOR_DISPLAY_NAME,
  };
}

/**
 * Throws (via redirect) if the user is not the whitelisted operator.
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
  if (!OPERATOR_EMAIL) return false;
  return email.toLowerCase().trim() === OPERATOR_EMAIL;
}
