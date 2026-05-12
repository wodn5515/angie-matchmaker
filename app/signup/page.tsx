import { UserShell } from "@/components/user/user-shell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * V2 가입 진입 페이지.
 *
 * 디자이너 골격: 헤더(타이틀+서브) + 운영자가 누구인지 / 추천인 필수 안내 / Google 가입 CTA.
 *
 * TODO(worker, task-B):
 *  - 이미 OAuth 인증된 가입자(자기 friends row 있음) 는 onboarding/profile 또는 /me 로 redirect
 *  - "Google 로 가입하기" 버튼은 server action 으로 Supabase OAuth 시작 (signInWithOAuth)
 *  - OAuth callback 후 friends row 없으면 /onboarding/profile 로 자동 라우팅 (proxy.ts 가드)
 */
export default function SignupPage() {
  return (
    <UserShell>
      <div className="space-y-8">
        <header className="text-center space-y-3">
          <div className="text-5xl">🎀</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            지인이 추천해준 <span className="text-pink-400">소개팅</span>이에요
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            본인 정보를 직접 채우고
            <br />
            운영자가 잘 맞을 사람을 찾아드려요.
          </p>
        </header>

        <section className="rounded-2xl border border-pink-500/20 bg-pink-500/5 px-5 py-4 text-[12px] text-[var(--color-fg-muted)] space-y-2">
          <p className="text-fg font-semibold text-sm">⚠ 추천인 정보가 꼭 필요해요</p>
          <p>
            안전을 위해 운영자가 아는 분의 추천이 있어야 가입할 수 있어요.
            가입 단계에서 추천인 이름 + 어떻게 아는 분인지 알려주세요.
          </p>
        </section>

        {/*
          TODO(worker, task-B): action 을 server action 으로 교체.
          예) <form action={startGoogleOAuthAction}>
        */}
        <form className="space-y-3" action="#todo-server-action">
          <Button size="lg" type="submit" className="w-full">
            <span className="text-base">G</span>
            <span>Google 로 가입하기</span>
          </Button>
          <p className="text-center text-[11px] text-[var(--color-fg-subtle)]">
            이미 가입했어요?{" "}
            <a href="/me" className="text-pink-400 hover:text-pink-300">
              내 페이지로 →
            </a>
          </p>
        </form>

        <p className="text-center text-[11px] text-[var(--color-fg-subtle)] leading-relaxed">
          가입 후에는 운영자의 심사가 있어요.
          <br />
          운영자가 승인하면 매칭 풀에 합류해요 💞
        </p>
      </div>
    </UserShell>
  );
}
