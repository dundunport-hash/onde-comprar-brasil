import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/store-contact";

type StatusPageTone = "error" | "not-found" | "loading";

interface StatusPageProps {
  tone?: StatusPageTone;
  eyebrow?: string;
  title: string;
  description: string;
  code?: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  onAction?: () => void;
}

export function StatusPage({
  tone = "error",
  eyebrow,
  title,
  description,
  code,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  onAction,
}: StatusPageProps) {
  const accent =
    tone === "loading"
      ? "border-t-secondary"
      : tone === "not-found"
        ? "border-t-accent"
        : "border-t-primary";

  return (
    <main className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-surface p-6 text-center shadow-md sm:p-8">
        <Link
          href="/"
          className="relative mx-auto block h-14 w-44 overflow-hidden"
          aria-label="Ir para o inicio"
        >
          <Image
            src="/favicon.ico"
            alt={`Logo ${SITE_NAME}`}
            fill
            sizes="176px"
            className="object-cover object-center"
            priority={tone !== "loading"}
          />
        </Link>

        <div
          className={`mx-auto mt-8 h-12 w-12 rounded-full border-4 border-border ${accent} ${
            tone === "loading" ? "animate-spin" : ""
          }`}
          aria-hidden="true"
        />

        {eyebrow && (
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </p>
        )}

        {code && (
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
            {code}
          </p>
        )}

        <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted">
          {description}
        </p>

        {(actionLabel || secondaryLabel) && (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {onAction && actionLabel ? (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center rounded bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:ring-offset-2 focus:ring-offset-surface"
              >
                {actionLabel}
              </button>
            ) : actionHref && actionLabel ? (
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center rounded bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:ring-offset-2 focus:ring-offset-surface"
              >
                {actionLabel}
              </Link>
            ) : null}

            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 focus:ring-offset-2 focus:ring-offset-surface"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
