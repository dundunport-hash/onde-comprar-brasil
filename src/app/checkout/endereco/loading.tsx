export default function CheckoutAddressLoading() {
  return (
    <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 px-4 py-6 sm:px-6 sm:py-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8 xl:py-10">
      <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-background" />
          <div className="grid gap-2">
            <div className="h-4 w-28 animate-pulse rounded bg-background" />
            <div className="h-7 w-56 animate-pulse rounded bg-background" />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="h-18 animate-pulse rounded-lg bg-background" />
            <div className="h-18 animate-pulse rounded-lg bg-background" />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[0.8fr_minmax(0,2fr)_0.7fr]">
            <div className="h-18 animate-pulse rounded-lg bg-background" />
            <div className="h-18 animate-pulse rounded-lg bg-background" />
            <div className="h-18 animate-pulse rounded-lg bg-background" />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_0.55fr]">
            <div className="h-18 animate-pulse rounded-lg bg-background" />
            <div className="h-18 animate-pulse rounded-lg bg-background" />
            <div className="h-18 animate-pulse rounded-lg bg-background" />
            <div className="h-18 animate-pulse rounded-lg bg-background" />
          </div>
        </div>
      </section>

      <aside className="h-80 min-w-0 animate-pulse rounded-2xl border border-border bg-surface shadow-sm" />
    </main>
  );
}
