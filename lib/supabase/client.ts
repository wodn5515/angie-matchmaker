"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // Prefer the new publishable key, fall back to the legacy anon key.
  // Both are valid public keys; only the naming changed.
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publishable,
  );
}
