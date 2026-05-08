export default function ExpiredPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-5xl">⏳</div>
      <h1 className="mt-3 text-xl font-semibold">유효하지 않은 링크예요</h1>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
        이 링크는 이미 사용되었거나 잘못된 주소예요.
      </p>
    </main>
  );
}
