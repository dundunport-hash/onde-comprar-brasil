import { currencyFormatter } from "@/lib/currencyFormatter";

import Link from "next/link";
import Image from "next/image";

type ProductWithDetails = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  oldPrice?: number | null;
  discountPercent: number;
  rating?: number | null;
  stock: number;
  category: {
    name: string;
    slug?: string | null;
  } | null;
};

type ProductListProps = {
  productsPromise: Promise<(ProductWithDetails | null)[]>;
};

function isControlledMedicationCategory(
  category: {
    name?: string | null;
    slug?: string | null;
  } | null,
) {
  return (
    category?.slug === "medicamentos-controlados" ||
    category?.name?.toLowerCase() === "medicamentos controlados"
  );
}

export async function ProductList({ productsPromise }: ProductListProps) {
  const products = await productsPromise;

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Nenhum produto encontrado</h2>
        <p className="mt-2 text-sm text-muted">
          Ajuste a busca, filtros ou ordenação para ver outros produtos.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted">
        {products.length} produto{products.length === 1 ? "" : "s"} encontrado
        {products.length === 1 ? "" : "s"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          if (!product) {
            return null;
          }

          const isControlledMedication = isControlledMedicationCategory(
            product.category,
          );

          return (
            <Link
              href={`/product/${product.slug}`}
              key={product.id}
              className="group block"
            >
              <article className="rounded-lg border border-border bg-surface p-4 shadow-sm transition-all hover:shadow-md">
                <div className="relative h-48 w-full overflow-hidden rounded-md bg-background">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      style={{ objectFit: "contain" }}
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-200 text-muted-foreground">
                      Sem Imagem
                    </div>
                  )}
                  {product.discountPercent > 0 && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      -{product.discountPercent}%
                    </span>
                  )}
                </div>
                <div className="mt-4 flex min-h-32 flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                      {product.category?.name ?? "Sem categoria"}
                    </p>
                    <h2
                      className="mt-2 line-clamp-2 h-12 text-base font-semibold leading-6 text-foreground group-hover:text-primary-foreground"
                      title={product.name}
                    >
                      {product.name}
                    </h2>
                    {product.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">
                        {product.description}
                      </p>
                    )}
                    {isControlledMedication && (
                      <p className="mt-3 rounded-lg border border-warning/40 bg-yellow-50 px-3 py-2 text-[11px] font-medium leading-4 text-warning">
                        Este medicamento só é vendido com receita e somente para
                        retirar na loja.
                      </p>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      {product.oldPrice && product.discountPercent > 0 ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted line-through">
                            {currencyFormatter.format(product.oldPrice)}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {currencyFormatter.format(product.price)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-primary">
                          {currencyFormatter.format(product.price)}
                        </p>
                      )}
                      {product.rating && (
                        <p className="text-xs text-muted">
                          Classificação: {product.rating.toFixed(1)} / 5
                        </p>
                      )}
                      <p className="text-xs text-muted">
                        Estoque: {product.stock}
                      </p>
                    </div>
                    <button className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </>
  );
}
