import { requireOperator } from "@/lib/auth/operator";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "설정 — matchmaker" };

export default async function SettingsPage() {
  const session = await requireOperator();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">설정</p>
        <h1 className="text-2xl font-semibold tracking-tight">계정</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>운영자</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <p>
            <span className="text-[11px] text-[var(--color-fg-muted)] mr-2">
              표시 이름
            </span>
            {session.displayName}
          </p>
          <p>
            <span className="text-[11px] text-[var(--color-fg-muted)] mr-2">
              이메일
            </span>
            {session.email}
          </p>
          <p className="text-[11px] text-[var(--color-fg-subtle)] pt-2">
            이름과 화이트리스트 이메일은 환경변수로 관리됩니다.
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>로그아웃</CardTitle>
        </CardHeader>
        <CardBody>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-fg-muted)] hover:text-fg hover:bg-[var(--color-surface-2)]"
            >
              로그아웃
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
