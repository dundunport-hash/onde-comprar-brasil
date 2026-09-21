import { Suspense } from "react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CatalogFilters } from "@/components/CatalogFilters";
import {
  CatalogPagination,
  CatalogEmptyState,
} from "@/components/CatalogPagination";
import { CatalogProductCard } from "@/components/CatalogProductCard";
import {
  type CatalogCategory,
  type CatalogProduct,
  getCachedCatalogCategories,
  getCachedCatalogProductCount,
  getCachedCatalogProducts,
} from "@/lib/catalog-cache";
import {
  PRODUCTS_PER_PAGE,
  getProductFilters,
  getRequestedPage,
  getSafePage,
  getSingleParam,
  type ProductSearchParams,
} from "@/lib/products-query";
import {
  HomeBenefits,
  HomeCategories,
  HomeProductShelf,
} from "@/components/HomeShowcase";
import { selectHomeProducts } from "@/lib/home-products";
import { getCachedHomeProducts } from "@/lib/catalog-cache";
import { SITE_NAME } from "@/lib/store-contact";

type HomeSearchParams = ProductSearchParams & {
  sort?: string | string[];
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  return (
    <main className=" bg-background text-foreground">
      <BannerCarousel />

      <Suspense fallback={<HomeCatalogSkeleton />}>
        <HomeCatalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function HomeCatalog({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const query = await searchParams;
  const productFilters = getProductFilters(query);
  const sort = getSingleParam(query.sort);
  const filters = {
    ...productFilters,
    sort,
  };
  const requestedPage = getRequestedPage(query);
  const showShowcase =
    !Object.values(productFilters).some(Boolean) &&
    !sort &&
    requestedPage === 1;

  const [categories, totalProducts, homeCandidates] = await Promise.all([
    getCachedCatalogCategories(),
    getCachedCatalogProductCount(productFilters),
    showShowcase ? getCachedHomeProducts() : Promise.resolve(null),
  ]);
  const shelves = homeCandidates ? selectHomeProducts(homeCandidates) : null;

  const { currentPage, totalPages } = getSafePage(requestedPage, totalProducts);
  const products = (await getCachedCatalogProducts({
    filters: productFilters,
    page: currentPage,
    sort,
  })) as CatalogProduct[];

  const categoriesList = categories as CatalogCategory[];

  const firstProduct = totalProducts
    ? (currentPage - 1) * PRODUCTS_PER_PAGE + 1
    : 0;
  const lastProduct = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);

  return (
    <>
      {shelves && (
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-2 py-3 sm:px-4 lg:px-6">
          <HomeCategories categories={categoriesList} />
          <HomeProductShelf
            id="ofertas"
            title="Ofertas em destaque"
            description="Uma selecao de produtos com desconto vigente e estoque disponivel."
            items={shelves.offers}
          />
          <HomeProductShelf
            id="destaques"
            title="Mais vendidos"
            description="Explore produtos adicionados recentemente ao catalogo."
            items={shelves.highlights}
          />
          <HomeBenefits />
        </div>
      )}
      <section
        id="catalogo"
        aria-labelledby="catalog-title"
        className="mx-auto grid w-full max-w-7xl scroll-mt-44 gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {SITE_NAME}
            </p>
            <h2
              id="catalog-title"
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Explore o catalogo
            </h2>
          </div>
          <p className="text-sm text-muted">
            {totalProducts} produto{totalProducts === 1 ? "" : "s"} encontrado
            {totalProducts === 1 ? "" : "s"}
          </p>
        </div>
        <CatalogFilters filters={filters} categories={categoriesList} />
        {totalProducts > 0 && (
          <div className="flex flex-wrap justify-between gap-2 text-sm text-muted">
            <p>
              Exibindo {firstProduct}-{lastProduct} de {totalProducts} produtos
            </p>
            <p>
              Pagina {currentPage} de {totalPages}
            </p>
          </div>
        )}
        {products.length === 0 ? (
          <CatalogEmptyState
            hasFilters={Object.values(productFilters).some(Boolean)}
          />
        ) : (
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <CatalogPagination
          filters={filters}
          currentPage={currentPage}
          totalPages={totalPages}
        />
      </section>
    </>
  );
}

function HomeCatalogSkeleton() {
  return (
    <section
      aria-label="Carregando catalogo"
      aria-busy="true"
      className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 sm:py-10"
    >
      <p role="status" className="text-sm text-muted">
        Carregando produtos...
      </p>
      <div aria-hidden="true" className="grid gap-5 motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-surface" />
        <div className="h-80 rounded-2xl border border-border bg-surface sm:h-60" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="aspect-square bg-background" />
              <div className="grid gap-3 p-3 sm:p-4">
                <div className="h-4 w-2/3 rounded bg-background" />
                <div className="h-10 rounded bg-background" />
                <div className="h-6 w-3/4 rounded bg-background" />
                <div className="h-11 rounded-xl bg-background" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
