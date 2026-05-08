"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({
  error,
  reason,
}: {
  error?: string;
  reason?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const errorMessage =
    localError ??
    (error === "not_operator"
      ? "허용된 운영자 계정이 아닙니다. 등록된 Gmail로 다시 로그인해주세요."
      : error === "oauth_failed"
        ? "Google 로그인에 실패했습니다. 다시 시도해주세요."
        : reason === "session_expired"
          ? "세션이 만료되었습니다. 다시 로그인해주세요."
          : null);

  const onGoogle = async () => {
    setLoading(true);
    setLocalError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signinError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signinError) {
        setLocalError(signinError.message);
        setLoading(false);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "알 수 없는 오류");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        size="lg"
        className="w-full"
        onClick={onGoogle}
        disabled={loading}
      >
        {loading ? "이동 중…" : "Google 계정으로 로그인"}
      </Button>
      {errorMessage ? (
        <p className="text-xs text-[var(--color-danger)] text-center">
          {errorMessage}
        </p>
      ) : null}
      <p className="text-[11px] text-[var(--color-fg-subtle)] text-center">
        등록된 Gmail로만 접근 가능합니다.
      </p>
    </div>
  );
}
