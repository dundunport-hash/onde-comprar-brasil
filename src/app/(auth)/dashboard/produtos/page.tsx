import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { getCachedCatalogCategories } from "@/lib/catalog-cache";
import { prisma } from "@/lib/prisma";
import {
  PRODUCTS_PER_PAGE,
  buildProductWhere,
  buildProductsHref,
  getProductFilters,
  getRequestedPage,
  getSingleParam,
  getSafePage,
  type ProductSearchParams,
} from "@/lib/products-query";
import { SITE_NAME } from "@/lib/store-contact";
import { deleteProduct } from "./actions";

export const metadata: Metadata = {
  title: `Produtos | Dashboard ${SITE_NAME}`,
  description:
    "Gerencie o catálogo de produtos da loja com busca, filtros e paginação.",
  robots: {
    index: false,
    follow: false,
  },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  ean: bigint | null;
  price: number;
  stock: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  active: boolean;
  category: {
    name: string;
  } | null;
};

type CategoryFilter = {
  id: string;
  name: string;
};

async function getProductsPage(where: Record<string, unknown>, page: number) {
  return prisma.product.findMany({
    where,
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>;
}) {
  await requireAdminSession();

  const query = await searchParams;
  const filters = getProductFilters(query);
  const requestedPage = getRequestedPage(query);
  const where = buildProductWhere(filters);

  const [totalProducts, categories] = await Promise.all([
    prisma.product.count({ where }),
    getCachedCatalogCategories(),
  ]);

  const categoriesList = categories as unknown as CategoryFilter[];

  const { currentPage, totalPages } = getSafePage(requestedPage, totalProducts);
  const products = await getProductsPage(where, currentPage);

  return (
    <ProductsContent
      products={products}
      totalProducts={totalProducts}
      currentPage={currentPage}
      totalPages={totalPages}
      categories={categoriesList}
      filters={filters}
      statusMessage={getProductStatusMessage(query)}
    />
  );
}

function getProductStatusMessage(query: ProductSearchParams) {
  if (getSingleParam(query.created) === "1") {
    return "Produto cadastrado com sucesso.";
  }

  if (getSingleParam(query.updated) === "1") {
    return "Produto atualizado com sucesso.";
  }

  if (getSingleParam(query.deleted) === "1") {
    return "Produto excluido com sucesso.";
  }

  return null;
}

function ProductsContent({
  products,
  totalProducts,
  currentPage,
  totalPages,
  categories,
  filters,
  statusMessage,
}: {
  products: ProductListItem[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  categories: CategoryFilter[];
  filters: {
    q: string;
    categoryId: string;
    status: string;
    stock: string;
  };
  statusMessage: string | null;
}) {
  const hasActiveFilters = Boolean(
    filters.q || filters.categoryId || filters.status || filters.stock,
  );
  const firstProduct = totalProducts
    ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1
    : 0;
  const lastProduct = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Produtos</h1>
          <p className="mt-2 text-sm text-muted">
            Cadastre, edite e remova produtos da loja.
          </p>
        </div>

        <Link
          href="/dashboard/produtos/novo"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 font-medium text-background transition hover:bg-primary/90"
        >
          Novo produto
        </Link>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="mt-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <form
        action="/dashboard/produtos"
        className="mt-8 grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_150px_160px_auto] lg:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="q">
              Busca
            </label>
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Nome, slug ou descrição"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="categoryId"
            >
              Categoria
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={filters.categoryId}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="status"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="stock"
            >
              Estoque
            </label>
            <select
              id="stock"
              name="stock"
              defaultValue={filters.stock}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todos</option>
              <option value="available">Com estoque</option>
              <option value="empty">Sem estoque</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 font-medium text-background transition hover:bg-primary/90"
          >
            Filtrar
          </button>
        </div>

        {hasActiveFilters && (
          <div>
            <Link
              href="/dashboard/produtos"
              className="text-sm font-medium text-primary hover:underline"
            >
              Limpar filtros
            </Link>
          </div>
        )}
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Exibindo {firstProduct}-{lastProduct} de {totalProducts} produto
          {totalProducts === 1 ? "" : "s"}
        </p>
        <p>
          Página {currentPage} de {totalPages}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {products.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold">Nenhum produto encontrado</h2>
            <p className="mt-2 text-sm text-muted">
              Ajuste a busca ou os filtros para ver outros resultados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-210 border-collapse text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 font-semibold">EAN</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Preço</th>
                  <th className="px-4 py-3 font-semibold">Estoque</th>
                  <th className="px-4 py-3 font-semibold">Logistica</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {product.name}
                      </div>
                      <div className="text-xs text-muted">{product.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {product.ean?.toString() ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {product.category?.name ?? "Sem categoria"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {currencyFormatter.format(product.price)}
                    </td>
                    <td className="px-4 py-3">{product.stock}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      <div>
                        {product.lengthCm} x {product.widthCm} x{" "}
                        {product.heightCm} cm
                      </div>
                      <div>{product.weightKg} kg</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/produtos/${product.id}/editar`}
                          className="rounded-lg bg-secondary px-3 py-2 font-medium text-foreground transition hover:bg-secondary/90"
                        >
                          Editar
                        </Link>
                        <form action={deleteProduct}>
                          <input
                            type="hidden"
                            name="productId"
                            value={product.id}
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-danger px-3 py-2 font-medium text-danger transition hover:bg-danger hover:text-background"
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Link
            href={buildProductsHref({
              ...filters,
              page: Math.max(currentPage - 1, 1),
            })}
            aria-disabled={currentPage === 1}
            className={`rounded-lg border border-border px-4 py-2 text-sm font-medium transition ${
              currentPage === 1
                ? "pointer-events-none opacity-50"
                : "hover:border-primary"
            }`}
          >
            Anterior
          </Link>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <Link
                key={page}
                href={buildProductsHref({ ...filters, page })}
                aria-current={page === currentPage ? "page" : undefined}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  page === currentPage
                    ? "border-primary/10 bg-primary text-background"
                    : "border-border hover:border-primary"
                }`}
              >
                {page}
              </Link>
            ),
          )}

          <Link
            href={buildProductsHref({
              ...filters,
              page: Math.min(currentPage + 1, totalPages),
            })}
            aria-disabled={currentPage === totalPages}
            className={`rounded-lg border border-border px-4 py-2 text-sm font-medium transition ${
              currentPage === totalPages
                ? "pointer-events-none opacity-50"
                : "hover:border-primary"
            }`}
          >
            Próxima
          </Link>
        </nav>
      )}
    </main>
  );
}
