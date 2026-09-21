export default function DashboardLoading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <div className="h-4 w-28 animate-pulse rounded bg-surface" />
          <div className="h-10 w-56 animate-pulse rounded bg-surface" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-lg bg-surface" />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface p-5 shadow-sm"
          >
            <div className="h-5 w-24 animate-pulse rounded bg-background" />
            <div className="mt-4 h-9 w-20 animate-pulse rounded bg-background" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-background" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="h-96 animate-pulse rounded-lg border border-border bg-surface" />
        <div className="h-96 animate-pulse rounded-lg border border-border bg-surface" />
      </section>
    </div>
  );
}
