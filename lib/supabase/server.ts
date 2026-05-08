import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Read the publishable key, accepting the new `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 * (sb_publishable_…) and falling back to the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * for projects that haven't migrated yet.
 */
function publishableKey(): string {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  return v;
}

/** Same fallback for the secret (server-only) key. */
function secretKey(): string {
  const v =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) throw new Error("SUPABASE_SECRET_KEY is not set");
  return v;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — Next forbids cookie writes there.
            // Cookies will be refreshed by proxy on the next request.
          }
        },
      },
    },
  );
}

/**
 * Secret-key (former service_role) client for server-only DB ops that bypass RLS.
 * Only use on the server. Never expose this key to the browser.
 */
export function createSupabaseServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey(),
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}
