import Link from "next/link";
import type { CatalogCategory } from "@/lib/catalog-cache";
import type { ProductFilters } from "@/lib/products-query";

export type CatalogFiltersValue = ProductFilters & { sort: string };
const fieldClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm";

export function CatalogFilters({
  filters,
  categories,
}: {
  filters: CatalogFiltersValue;
  categories: CatalogCategory[];
}) {
  const selects = [
    {
      name: "categoryId",
      label: "Categoria",
      options: [
        { value: "", label: "Todas as categorias" },
        ...categories.map(({ id, name }) => ({ value: id, label: name })),
      ],
    },
    {
      name: "status",
      label: "Status",
      options: [
        { value: "", label: "Todos" },
        { value: "active", label: "Ativos" },
        { value: "inactive", label: "Inativos" },
      ],
    },
    {
      name: "stock",
      label: "Estoque",
      options: [
        { value: "", label: "Todos" },
        { value: "available", label: "Com estoque" },
        { value: "empty", label: "Sem estoque" },
      ],
    },
    {
      name: "sort",
      label: "Ordenar por",
      options: [
        { value: "", label: "Mais recentes" },
        { value: "name-asc", label: "Nome A–Z" },
        { value: "price-asc", label: "Menor preço cadastrado" },
        { value: "price-desc", label: "Maior preço cadastrado" },
        { value: "stock-desc", label: "Maior estoque" },
      ],
    },
  ] as const;

  return (
    <form
      key={JSON.stringify(filters)}
      action="/#catalogo"
      method="get"
      aria-label="Filtrar catálogo"
      className="grid gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
          <label htmlFor="catalog-q" className="text-sm font-semibold">
            Buscar produtos
          </label>
          <input
            id="catalog-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Busque por nome ou descrição"
            maxLength={120}
            className={fieldClass}
          />
        </div>
        {selects.map(({ name, label, options }) => (
          <div key={name} className="grid min-w-0 gap-1.5">
            <label
              htmlFor={`catalog-${name}`}
              className="text-sm font-semibold"
            >
              {label}
            </label>
            <select
              id={`catalog-${name}`}
              name={name}
              defaultValue={filters[name]}
              className={fieldClass}
            >
              {options.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Ordenação por preço não considera promoções ou cupons.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {Object.values(filters).some(Boolean) && (
            <Link
              href="/#catalogo"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              Limpar filtros
            </Link>
          )}
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </form>
  );
}
