import Image from "next/image";
import Link from "next/link";
import { Package, ShoppingCart, Star } from "lucide-react";
import { CartActionForm } from "./CartActionForm";
import { addCartItem } from "@/app/carrinho/actions";
import type { CatalogProduct } from "@/lib/catalog-cache";
import { calculateProductPricing } from "@/lib/pricing";
import { currencyFormatter } from "@/lib/currencyFormatter";

export type CatalogCardProduct = Pick<
  CatalogProduct,
  | "id"
  | "slug"
  | "name"
  | "imageUrl"
  | "price"
  | "active"
  | "stock"
  | "category"
  | "promotions"
  | "coupons"
>;

export function CatalogProductCard({
  product,
}: {
  product: CatalogCardProduct;
}) {
  const pricing = calculateProductPricing(product.price, product.promotions);
  const available = product.active && product.stock > 0;
  const coupons = product.coupons
    .map(({ coupon }) => coupon)
    .filter(({ active }) => active);
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`Ver detalhes de ${product.name}`}
        className="group block rounded-t-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <div className="relative aspect-square bg-white">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              loading="lazy"
              className="object-contain p-3 sm:p-4"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
              <Package className="h-10 w-10" aria-hidden="true" />
              <span className="text-xs">Sem imagem</span>
            </div>
          )}
          {pricing.discount > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-black text-primary-foreground">
              -{pricing.discountPercent.toLocaleString("pt-BR")}%
            </span>
          )}
        </div>
        <div className="grid gap-1.5 p-3 pb-0 sm:p-4 sm:pb-0">
          <p className="truncate text-xs text-muted">
            {product.category?.name ?? "Produtos brasileiros"}
          </p>
          <h3
            title={product.name}
            className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 group-hover:text-primary"
          >
            {product.name}
          </h3>
          <div
            className="flex items-center gap-0.5 text-secondary"
            aria-label="Produto bem avaliado"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className="h-3.5 w-3.5 fill-secondary"
                aria-hidden="true"
              />
            ))}
            <span className="ml-1 text-[11px] font-semibold text-muted">
              ({product.stock.toLocaleString("pt-BR")})
            </span>
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="mt-auto">
          <div className="min-h-4 text-xs text-muted">
            {pricing.discount > 0 && (
              <>
                <span className="sr-only">Preço anterior: </span>
                <s>{currencyFormatter.format(pricing.basePrice)}</s>
              </>
            )}
          </div>
          <p className="break-words text-lg font-black text-institutional sm:text-xl">
            {currencyFormatter.format(pricing.finalPrice)}
          </p>
          <p
            className={`mt-1 text-xs ${available ? "text-primary" : "text-muted"}`}
          >
            {available ? "Em estoque" : "Indisponível"}
          </p>
        </div>
        <CartActionForm
          action={addCartItem}
          successMessage={`${product.name} foi adicionado ao carrinho.`}
          className="grid gap-2 [&[aria-busy=true]_button]:pointer-events-none [&[aria-busy=true]_button]:opacity-50"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value="1" />
          {coupons.length > 0 && (
            <details className="rounded-lg border border-border p-2 text-xs">
              <summary className="flex min-h-11 cursor-pointer items-center rounded font-semibold focus-visible:outline-2 focus-visible:outline-primary">
                Tem um cupom?
              </summary>
              <label
                htmlFor={`catalog-coupon-${product.id}`}
                className="mb-1 block"
              >
                Cupom do produto
              </label>
              <input
                id={`catalog-coupon-${product.id}`}
                name="couponCode"
                placeholder="Digite o código"
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-base uppercase focus-visible:outline-2 focus-visible:outline-primary"
              />
              <p className="mt-2 text-muted">
                Cupons disponíveis:{" "}
                {coupons
                  .map(
                    (coupon) =>
                      `${coupon.discountPercent.toLocaleString("pt-BR")}%`,
                  )
                  .join(", ")}
                . Sujeitos à validação.
              </p>
            </details>
          )}
          <button
            type="submit"
            disabled={!available}
            aria-label={
              available
                ? `Adicionar ${product.name} ao carrinho`
                : `${product.name} indisponível`
            }
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-2 py-2 text-xs font-black text-primary-foreground hover:bg-[#007d37] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {available && (
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            )}
            {available ? "Adicionar ao carrinho" : "Indisponível"}
          </button>
        </CartActionForm>
      </div>
    </article>
  );
}
