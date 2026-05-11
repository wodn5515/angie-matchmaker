import { notFound, redirect } from "next/navigation";
import { OPERATOR_DISPLAY_NAME } from "@/lib/auth/operator";
import { getFriendInvitationByToken } from "@/lib/db/friend-invitations";
import { RegistrationForm } from "./registration-form";

export const dynamic = "force-dynamic";

export default async function RegistrationLanding({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getFriendInvitationByToken(token);
  if (!invitation) notFound();
  if (invitation.status === "used") {
    redirect(`/r/${token}/expired`);
  }

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <div className="text-center space-y-3">
        <div className="text-5xl">🎀</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          안녕! <span className="text-pink-400">{OPERATOR_DISPLAY_NAME}</span>이 보낸 등록 링크야
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          잠깐 본인 정보를 알려줄래?
          <br />
          {OPERATOR_DISPLAY_NAME}이 잘 어울릴 사람을 찾아주려고 해 ✨
        </p>
      </div>

      <RegistrationForm token={token} />

      <p className="mt-6 text-center text-[11px] text-[var(--color-fg-subtle)]">
        한 번만 사용할 수 있는 링크예요. 등록하면 자동으로 만료돼요.
      </p>
    </main>
  );
}
