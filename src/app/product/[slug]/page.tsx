import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Barcode } from "lucide-react";
import { addCartItem } from "@/app/carrinho/actions";
import {
  getCachedProductBySlug,
  getCachedProductMetadataBySlug,
  type ProductDetail,
} from "@/lib/catalog-cache";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { calculateCouponDiscount } from "@/lib/coupons";
import { calculateProductPricing } from "@/lib/pricing";
import { CartActionForm } from "@/components/CartActionForm";
import { SITE_NAME } from "@/lib/store-contact";
import { ProductImageGallery } from "./ProductImageGallery";

type ProductPageParams = {
  slug: string;
};

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatDecimal(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function getTextLines(value: string | null) {
  // Preserve decimals, model names and punctuation in the registered text.
  return (
    value
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean) ?? []
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ProductPageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductMetadataBySlug(slug);

  if (!product) {
    return {
      title: `Produto nao encontrado | ${SITE_NAME}`,
    };
  }

  return {
    title: `${product.name} | ${SITE_NAME}`,
    description:
      product.description ??
      `Confira detalhes, preco e estoque de ${product.name}.`,
    alternates: {
      canonical: `/product/${slug}`,
    },
    openGraph: {
      title: `${product.name} | ${SITE_NAME}`,
      description:
        product.description ??
        `Confira detalhes, preco e estoque de ${product.name}.`,
      url: `/product/${slug}`,
      type: "website",
      images: product.imageUrl
        ? [
            {
              url: product.imageUrl,
              alt: product.name,
            },
          ]
        : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<ProductPageParams>;
}) {
  const { slug } = await params;
  const product = (await getCachedProductBySlug(slug)) as ProductDetail | null;

  if (!product) {
    notFound();
  }

  const pricing = calculateProductPricing(product.price, product.promotions);
  const hasDiscount = pricing.discount > 0;
  const isAvailable = product.active && product.stock > 0;
  const availableCoupons = product.coupons
    .map((couponProduct) => couponProduct.coupon)
    .filter((coupon) => coupon.active);
  const hasProductCoupons = availableCoupons.length > 0;

  const images = [
    product.imageUrl,
    product.imageUrl2,
    product.imageUrl3,
  ].filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const descriptionLines = getTextLines(product.description);
  const technicalDataLines = getTextLines(product.technicalData);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <nav
        aria-label="Caminho de navegação"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted"
      >
        <Link
          href="/#catalogo"
          className="inline-flex min-h-11 items-center rounded-lg font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Produtos
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="min-w-0 break-words">
          {product.name}
        </span>
      </nav>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="min-w-0 lg:sticky lg:top-32">
          <ProductImageGallery
            key={images.join("|")}
            images={images}
            productName={product.name}
          />
        </div>

        <div className="min-w-0 space-y-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {product.category?.name ?? "Produtos brasileiros"}
            </p>
            <h1 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <a
              href="#especificacoes"
              className="mt-2 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Ver especificações
            </a>
          </header>
          <section
            aria-label="Preço e compra"
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
          >
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-3">
                {hasDiscount && (
                  <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                    -{formatPercent(pricing.discountPercent)}
                  </span>
                )}
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
                  {isAvailable
                    ? "Disponível em estoque"
                    : "Indisponível no momento"}
                </span>
              </div>

              <div className="grid gap-1 py-4">
                <p className="text-sm text-muted">Preço do produto</p>
                {hasDiscount && (
                  <p className="text-sm text-muted">
                    De <s>{currencyFormatter.format(pricing.basePrice)}</s> por
                  </p>
                )}
                <p className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {currencyFormatter.format(pricing.finalPrice)}
                </p>
                {hasDiscount && (
                  <p className="text-sm font-medium text-primary">
                    Você economiza {currencyFormatter.format(pricing.discount)}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted">
                  Frete não incluído. Confira as formas de pagamento ao
                  finalizar a compra.
                </p>
              </div>

              <CartActionForm
                action={addCartItem}
                successMessage={`${product.name} foi adicionado ao carrinho.`}
                className="grid gap-3"
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="quantity" value="1" />
                {hasProductCoupons && (
                  <details className="rounded-xl border border-border bg-background p-3">
                    <summary className="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary">
                      Tem um cupom?
                    </summary>
                    <label
                      className="text-sm font-semibold"
                      htmlFor="couponCode"
                    >
                      Cupom do produto
                    </label>
                    <input
                      id="couponCode"
                      name="couponCode"
                      placeholder="Digite o codigo do cupom"
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                    />
                    <div className="grid gap-2">
                      {availableCoupons.map((coupon) => {
                        const discountAmount = calculateCouponDiscount(
                          pricing.finalPrice,
                          coupon.discountPercent,
                        );
                        const couponFinalPrice =
                          pricing.finalPrice - discountAmount;

                        return (
                          <div
                            key={coupon.id}
                            className="rounded-lg bg-background px-3 py-2 text-xs text-muted"
                          >
                            <div className="flex items-center justify-between gap-3 font-medium text-foreground">
                              <span>{coupon.code}</span>
                              <span>
                                {formatPercent(coupon.discountPercent)}
                              </span>
                            </div>
                            <div className="mt-1 grid gap-1">
                              <span>
                                Preco original:{" "}
                                {currencyFormatter.format(pricing.finalPrice)}
                              </span>
                              <span>
                                Desconto:{" "}
                                {currencyFormatter.format(discountAmount)}
                              </span>
                              <span>
                                Preco final:{" "}
                                {currencyFormatter.format(couponFinalPrice)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
                <button
                  type="submit"
                  disabled={!isAvailable}
                  className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAvailable
                    ? "Adicionar ao carrinho"
                    : "Produto indisponível"}
                </button>
              </CartActionForm>

              <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                <Barcode
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="font-medium">
                  EAN: {product.ean ?? "Nao cadastrado"}
                </span>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="delivery-warranty-title"
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <h2
              id="delivery-warranty-title"
              className="text-base font-semibold"
            >
              Entrega e garantia
            </h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="font-semibold">Entrega no seu endereço</dt>
                <dd className="mt-1 leading-6 text-muted">
                  Consulte as opções de frete e o prazo para seu CEP no
                  carrinho, antes de finalizar a compra.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Retirada na loja</dt>
                <dd className="mt-1 leading-6 text-muted">
                  Selecione a retirada no carrinho e confirme com a loja quando
                  o pedido estará disponível.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Garantia do produto</dt>
                <dd className="mt-1 leading-6 text-muted">
                  As condições de garantia deste produto não estão informadas no
                  cadastro. Consulte a loja sobre cobertura e assistência antes
                  de comprar.
                </dd>
              </div>
            </dl>
            <Link
              href="/contato"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              Tirar dúvidas com a loja
            </Link>
          </section>
        </div>
      </div>
      <div className="mt-10 grid w-full gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="description-title"
          className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <h2 id="description-title" className="text-xl font-semibold">
            Sobre o produto
          </h2>
          <div className="mt-4 grid gap-3 break-words text-sm leading-7 text-muted">
            {descriptionLines.length > 0 ? (
              descriptionLines.map((line, index) => <p key={index}>{line}</p>)
            ) : (
              <p>
                Descrição ainda não informada. Fale com a loja para conhecer
                este produto.
              </p>
            )}
          </div>
        </section>

        <section
          id="especificacoes"
          aria-labelledby="specs-title"
          className="min-w-0 scroll-mt-44 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <h2 id="specs-title" className="text-xl font-semibold">
            Especificações técnicas
          </h2>
          <div className="mt-4 grid gap-3 break-words text-sm leading-7 text-muted">
            {technicalDataLines.length > 0 ? (
              technicalDataLines.map((line, index) => <p key={index}>{line}</p>)
            ) : (
              <p>
                Especificações ainda não informadas. Consulte a loja para
                confirmar a compatibilidade antes de comprar.
              </p>
            )}
          </div>
          <h3 className="mt-6 border-t border-border pt-4 text-sm font-semibold">
            Identificação e dados para envio
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            Medidas cadastradas para cálculo de frete; não representam
            necessariamente as dimensões do aparelho.
          </p>
          <dl className="mt-3 divide-y divide-border text-sm">
            {[
              ["Categoria", product.category?.name ?? "Não informada"],
              ["EAN", product.ean ?? "Não cadastrado"],
              [
                "Dimensões para envio (C × L × A)",
                `${formatDecimal(product.lengthCm)} × ${formatDecimal(product.widthCm)} × ${formatDecimal(product.heightCm)} cm`,
              ],
              ["Peso para envio", `${formatDecimal(product.weightKg)} kg`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid gap-1 py-3 sm:grid-cols-2 sm:gap-4"
              >
                <dt className="text-muted">{label}</dt>
                <dd className="break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
