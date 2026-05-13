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
      ? // V1 잔여 — 010 통합 후엔 실제 도달 케이스 없음 (운영자/가입자 모두 동일 진입).
        "Google 계정으로 다시 시도해주세요."
      : error === "oauth_failed"
        ? "Google 로그인에 실패했어요. 다시 시도해주세요."
        : reason === "session_expired"
          ? "세션이 만료되었어요. 다시 로그인해주세요."
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
        {loading ? "이동 중…" : "Google 로 시작"}
      </Button>
      {errorMessage ? (
        <p className="text-xs text-[var(--color-danger)] text-center">
          {errorMessage}
        </p>
      ) : null}
      <p className="text-[11px] text-[var(--color-fg-subtle)] text-center leading-relaxed">
        가입자는 추천인 정보가 필요해요.
        <br />
        로그인 후 안내를 따라 진행하세요.
      </p>
    </div>
  );
}
