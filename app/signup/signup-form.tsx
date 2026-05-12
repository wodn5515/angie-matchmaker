"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * V2 가입 진입 — Google OAuth 시작.
 *
 * `/auth/callback` 으로 콜백을 보내고, 거기서 운영자 / 가입자 분기 후
 * proxy 가드가 적절한 라우트로 redirect 한다 (PRD §5.5).
 */
export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = createSupabaseBrowserClient();
      const { error: signinError } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signinError) {
        setError(signinError.message);
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        type="button"
        className="w-full"
        disabled={loading}
        onClick={onGoogle}
      >
        <span className="text-base">G</span>
        <span>{loading ? "이동 중…" : "Google 로 가입하기"}</span>
      </Button>
      {error ? (
        <p className="text-center text-[11px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <p className="text-center text-[11px] text-[var(--color-fg-subtle)]">
        이미 가입했어요?{" "}
        <a href="/me" className="text-pink-400 hover:text-pink-300">
          내 페이지로 →
        </a>
      </p>
    </div>
  );
}
