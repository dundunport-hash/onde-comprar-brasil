import Link from "next/link";
import { SearchX } from "lucide-react";
import { buildProductsHref } from "@/lib/products-query";
import type { CatalogFiltersValue } from "./CatalogFilters";

const linkClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function CatalogPagination({
  filters,
  currentPage,
  totalPages,
}: {
  filters: CatalogFiltersValue;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]),
  )
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const href = (page: number) =>
    `${buildProductsHref({ ...filters, page }, "/")}#catalogo`;
  return (
    <nav
      aria-label="Paginação do catálogo"
      className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-6"
    >
      {currentPage === 1 ? (
        <span aria-disabled="true" className={`${linkClass} opacity-50`}>
          Anterior
        </span>
      ) : (
        <Link href={href(currentPage - 1)} className={linkClass}>
          Anterior
        </Link>
      )}
      {pages.map((page, index) => (
        <span key={page} className="inline-flex items-center gap-2">
          {index > 0 && page - pages[index - 1] > 1 && (
            <span aria-hidden="true" className="px-1 text-muted">
              …
            </span>
          )}
          <Link
            href={href(page)}
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className={`${linkClass} ${page === currentPage ? "border-primary bg-primary text-primary-foreground" : "bg-surface"}`}
          >
            {page}
          </Link>
        </span>
      ))}
      {currentPage === totalPages ? (
        <span aria-disabled="true" className={`${linkClass} opacity-50`}>
          Próxima
        </span>
      ) : (
        <Link href={href(currentPage + 1)} className={linkClass}>
          Próxima
        </Link>
      )}
    </nav>
  );
}

export function CatalogEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center">
      <SearchX className="h-10 w-10 text-muted" aria-hidden="true" />
      <h3 className="text-xl font-semibold">Nenhum produto encontrado</h3>
      <p className="max-w-md text-sm text-muted">
        {hasFilters
          ? "Tente outro termo ou remova os filtros para explorar mais produtos."
          : "Nosso catálogo está sendo atualizado."}
      </p>
      {hasFilters && (
        <Link
          href="/#catalogo"
          className={`${linkClass} mt-2 bg-primary text-primary-foreground`}
        >
          Limpar busca e filtros
        </Link>
      )}
    </div>
  );
}
