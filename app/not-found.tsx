import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="mt-3 text-xl font-semibold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
        주소가 잘못되었거나 삭제된 페이지일 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs hover:bg-[var(--color-surface)]"
      >
        대시보드로 가기
      </Link>
    </main>
  );
}
