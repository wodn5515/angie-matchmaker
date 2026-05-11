export default function ExpiredPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-20 text-center">
      <div className="text-5xl">⏳</div>
      <h1 className="mt-3 text-xl font-semibold">
        이미 사용된 등록 링크예요
      </h1>
      <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
        한 번만 사용할 수 있는 링크라서 더 이상 진행할 수 없어요.
      </p>
    </main>
  );
}
