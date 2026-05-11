export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-5xl">🔍</div>
      <h1 className="mt-3 text-xl font-semibold">
        등록 링크를 찾을 수 없어요
      </h1>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
        링크가 잘못되었거나 삭제됐을 수 있어요.
      </p>
    </main>
  );
}
