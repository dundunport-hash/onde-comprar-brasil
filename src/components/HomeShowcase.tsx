import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Package,
  ShoppingCart,
  Star,
  Store,
  Truck,
} from "lucide-react";
import type { CatalogCategory } from "@/lib/catalog-cache";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { selectHomeProducts } from "@/lib/home-products";
import { buildProductsHref } from "@/lib/products-query";

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

const categoryCardOrder = [
  "eletronicos",
  "casa-e-decoracao",
  "moda",
  "beleza-e-saude",
  "esporte-e-lazer",
  "alimentos-e-bebidas",
  "papelaria",
  "brinquedos",
  "automotivo",
  "pet-shop",
  "ferramentas",
] as const;

const categoryImageBySlug: Record<string, string> = {
  eletronicos: "/images/categories/01_eletronicos.png",
  "casa-e-decoracao": "/images/categories/02_casa_e_decoracao.png",
  moda: "/images/categories/03_moda.png",
  "beleza-e-saude": "/images/categories/04_beleza_e_saude.png",
  "esporte-e-lazer": "/images/categories/05_esporte_e_lazer.png",
  "alimentos-e-bebidas": "/images/categories/06_alimentos_e_bebidas.png",
  papelaria: "/images/categories/07_papelaria.png",
  brinquedos: "/images/categories/08_brinquedos.png",
  automotivo: "/images/categories/09_automotivo.png",
  "pet-shop": "/images/categories/10_pet_shop.png",
  ferramentas: "/images/categories/11_ferramentas.png",
};

export function HomeBenefits() {
  const benefits = [
    {
      title: "Entrega para todo o Brasil",
      text: "Consulte frete e prazo para o seu CEP no checkout.",
      icon: Truck,
    },
    {
      title: "Retirada na loja",
      text: "Escolha a retirada no checkout e acompanhe seu pedido.",
      icon: Store,
    },
    {
      title: "Atendimento com cuidado",
      text: "Tire duvidas sobre produtos e compras com nossa equipe.",
      icon: MessageCircle,
    },
  ];
  return (
    <section
      aria-labelledby="home-benefits-title"
      className="border border-border bg-surface p-5 shadow-sm sm:p-8"
    >
      <h2 id="home-benefits-title" className="text-2xl font-bold">
        Mais facilidade na sua compra
      </h2>
      <ul className="mt-6 grid gap-6 md:grid-cols-3">
        {benefits.map(({ title, text, icon: Icon }) => (
          <li key={title} className="flex gap-3">
            <Icon
              className="mt-1 h-6 w-6 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/contato"
        className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary ${focusClass}`}
      >
        Fale com a loja <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

type HomeCategory = Pick<CatalogCategory, "id" | "name" | "slug"> & {
  image?: string | null;
};

export function HomeCategories({ categories }: { categories: HomeCategory[] }) {
  const orderedCategories = [...categories].sort((a, b) => {
    const aIndex = categoryCardOrder.indexOf(
      a.slug as (typeof categoryCardOrder)[number],
    );
    const bIndex = categoryCardOrder.indexOf(
      b.slug as (typeof categoryCardOrder)[number],
    );

    if (aIndex === -1 && bIndex === -1) {
      return a.name.localeCompare(b.name, "pt-BR");
    }

    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });

  return (
    <section aria-labelledby="home-categories-title" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="home-categories-title"
            className="text-2xl font-black leading-tight text-foreground"
          >
            Compre por categoria
          </h2>
        </div>
        <Link
          href="/#catalogo"
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-black text-institutional ${focusClass}`}
        >
          Ver todas as categorias{" "}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {categories.length ? (
        <ul className="grid auto-cols-[7.25rem] grid-flow-col gap-2 overflow-x-auto pb-1 sm:auto-cols-[7.75rem] xl:grid-flow-row xl:grid-cols-12 xl:overflow-visible">
          {orderedCategories.map((category) => {
            const image =
              category.image ?? categoryImageBySlug[category.slug] ?? null;

            return (
              <li key={category.id} className="min-w-0">
                <Link
                  href={`${buildProductsHref({ categoryId: category.id, status: "active" }, "/")}#catalogo`}
                  className={`flex h-24 flex-col items-center justify-end gap-1 rounded-lg border border-border bg-[#eef2f5] px-2 pb-2 pt-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:shadow-md ${focusClass}`}
                >
                  <span className="relative flex h-16 w-full items-center justify-center">
                    {image ? (
                      <Image
                        src={image}
                        alt=""
                        width={84}
                        height={64}
                        className="max-h-16 w-auto object-contain drop-shadow-sm"
                      />
                    ) : (
                      <Package
                        className="h-10 w-10 text-primary"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="line-clamp-2 min-h-7 text-[0.72rem] font-black leading-[0.95rem] text-foreground">
                    {category.name}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0">
            <Link
              href="/#catalogo"
              className={`flex h-24 flex-col items-center justify-end gap-1 rounded-lg border border-border bg-[#eef2f5] px-2 pb-2 pt-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:shadow-md ${focusClass}`}
            >
              <span className="relative flex h-16 w-full items-center justify-center">
                <Image
                  src="/images/categories/12_mais_categorias.png"
                  alt=""
                  width={64}
                  height={64}
                  className="max-h-14 w-auto object-contain"
                />
              </span>
              <span className="line-clamp-2 min-h-7 text-[0.72rem] font-black leading-[0.95rem] text-foreground">
                Mais Categorias
              </span>
            </Link>
          </li>
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">
          As categorias estarao disponiveis em breve.
        </p>
      )}
    </section>
  );
}

type ShelfItem = ReturnType<typeof selectHomeProducts>["offers"][number];

export function HomeProductShelf({
  id,
  title,
  description,
  items,
}: {
  id: string;
  title: string;
  description: string;
  items: ShelfItem[];
}) {
  const isOffersShelf = id === "ofertas";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-44 gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id={`${id}-title`}
              className="text-2xl font-black text-foreground"
            >
              {title}
            </h2>
            {isOffersShelf && (
              <span className="rounded-md bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                APROVEITE!
              </span>
            )}
          </div>
          <p className="sr-only">{description}</p>
        </div>
        <Link
          href="/#catalogo"
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-black text-institutional ${focusClass}`}
        >
          {isOffersShelf
            ? "Ver todas as ofertas"
            : "Ver todos os mais vendidos"}{" "}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {items.length ? (
        <div
          className={
            isOffersShelf
              ? "grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]"
              : ""
          }
        >
          <ul
            className={
              isOffersShelf
                ? "grid grid-cols-2 gap-3 lg:grid-cols-4"
                : "grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6"
            }
          >
            {items.map(({ product, pricing }) => (
              <li key={product.id} className="min-w-0">
                <Link
                  href={`/product/${product.slug}`}
                  className={`group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md ${focusClass}`}
                >
                  <div className="relative aspect-square bg-white">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes={
                          isOffersShelf
                            ? "(min-width: 1280px) 170px, (min-width: 1024px) 25vw, 50vw"
                            : "(min-width: 1280px) 190px, (min-width: 1024px) 16vw, 50vw"
                        }
                        className="object-contain p-3"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <Package className="h-12 w-12" aria-hidden="true" />
                        <span className="sr-only">Imagem indisponivel</span>
                      </div>
                    )}
                    {pricing.discount > 0 && (
                      <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-black text-primary-foreground">
                        -{pricing.discountPercent.toLocaleString("pt-BR")}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
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
                    <div className="mt-auto">
                      {pricing.discount > 0 && (
                        <p className="text-[11px] text-muted">
                          <s>{currencyFormatter.format(pricing.basePrice)}</s>
                        </p>
                      )}
                      <p className="text-base font-black text-institutional sm:text-lg">
                        {currencyFormatter.format(pricing.finalPrice)}
                      </p>
                    </div>
                    <span className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-primary px-2 text-xs font-black text-primary-foreground group-hover:bg-[#007d37]">
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      Adicionar ao carrinho
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {isOffersShelf && <HomePromoCards />}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-muted">
          {id === "ofertas"
            ? "Nenhuma oferta disponivel no momento. Explore os demais produtos no catalogo."
            : "Novos destaques estarao disponiveis em breve. Confira o catalogo completo."}
        </p>
      )}
    </section>
  );
}

function HomePromoCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
      <Link
        href="/#catalogo"
        className={`${focusClass} relative isolate min-h-56 overflow-hidden rounded-lg bg-primary p-6 text-white shadow-sm`}
      >
        <Image
          src="/banner.png"
          alt=""
          fill
          sizes="(min-width: 1280px) 320px, 50vw"
          className="object-cover opacity-35"
        />
        <div className="relative">
          <p className="text-2xl font-black leading-tight">
            Produtos brasileiros com ate
          </p>
          <p className="mt-1 text-7xl font-black leading-none text-secondary">
            50%
          </p>
          <p className="text-2xl font-black leading-tight">de desconto</p>
          <span className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-black text-foreground">
            Aproveitar ofertas{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
      <Link
        href="/#catalogo"
        className={`${focusClass} relative isolate min-h-56 overflow-hidden rounded-lg bg-institutional p-6 text-white shadow-sm`}
      >
        <Image
          src="/banner.png"
          alt=""
          fill
          sizes="(min-width: 1280px) 320px, 50vw"
          className="object-cover object-right opacity-30"
        />
        <div className="relative max-w-56">
          <p className="text-2xl font-black leading-tight">
            Grandes marcas. Melhores precos.
          </p>
          <p className="mt-4 text-sm font-semibold leading-5 text-white/90">
            Tudo o que voce precisa, das melhores lojas, em um so lugar.
          </p>
          <span className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-institutional">
            Ver mais <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </div>
  );
}
