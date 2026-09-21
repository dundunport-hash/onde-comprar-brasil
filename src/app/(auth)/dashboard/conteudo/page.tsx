import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Info, Save } from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { getDashboardSitePageContents } from "@/lib/site-content";
import { SITE_NAME } from "@/lib/store-contact";
import { updateSiteContents } from "./actions";

export const metadata: Metadata = {
  title: `Conteudo | Dashboard ${SITE_NAME}`,
  description: "Edite paginas institucionais do site.",
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardContentSearchParams = {
  updated?: string | string[];
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardContentPage({
  searchParams,
}: {
  searchParams: Promise<DashboardContentSearchParams>;
}) {
  await requireAdminSession();
  const [contents, query] = await Promise.all([
    getDashboardSitePageContents(),
    searchParams,
  ]);
  const wasUpdated = getSingleParam(query.updated) === "1";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Conteudo do site
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Atualize as informacoes exibidas nas paginas Sobre e Termos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-primary/10 hover:text-primary"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
            Ver Sobre
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-primary/10 hover:text-primary"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Ver Termos
          </Link>
        </div>
      </div>

      {wasUpdated && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          Conteudo salvo com sucesso.
        </div>
      )}

      <form action={updateSiteContents} className="mt-8 grid gap-5">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Pagina Sobre</h2>
          </div>
          <textarea
            name="aboutContent"
            required
            rows={10}
            maxLength={12000}
            defaultValue={contents.about}
            className="mt-4 min-h-64 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
          <p className="mt-2 text-xs text-muted">
            Use linhas em branco para separar paragrafos.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Pagina Termos</h2>
          </div>
          <textarea
            name="termsContent"
            required
            rows={12}
            maxLength={12000}
            defaultValue={contents.terms}
            className="mt-4 min-h-72 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
          <p className="mt-2 text-xs text-muted">
            O texto sera exibido na pagina publica de Termos de uso.
          </p>
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background shadow-lg shadow-black/10 transition hover:bg-primary/90"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Salvar conteudo
          </button>
        </div>
      </form>
    </main>
  );
}
