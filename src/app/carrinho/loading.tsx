export default function CartLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-surface" />
          <div className="h-10 w-52 animate-pulse rounded bg-surface" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-surface" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="grid gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm sm:grid-cols-[112px_1fr]"
            >
              <div className="aspect-square animate-pulse rounded-lg bg-background" />
              <div className="grid gap-4">
                <div className="h-5 w-3/5 animate-pulse rounded bg-background" />
                <div className="h-4 w-40 animate-pulse rounded bg-background" />
                <div className="flex justify-between gap-3">
                  <div className="h-10 w-36 animate-pulse rounded-lg bg-background" />
                  <div className="h-10 w-28 animate-pulse rounded-lg bg-background" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <aside className="grid h-fit gap-4">
          <div className="h-72 animate-pulse rounded-lg border border-border bg-surface" />
          <div className="h-80 animate-pulse rounded-lg border border-border bg-surface" />
        </aside>
      </div>
    </div>
  );
}
