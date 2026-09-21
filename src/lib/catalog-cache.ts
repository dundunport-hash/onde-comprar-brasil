import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import {
  PRODUCTS_PER_PAGE,
  buildProductWhere,
  type ProductFilters,
} from "@/lib/products-query";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";

const CATALOG_CACHE_REVALIDATE_SECONDS = 5 * 60;
const CATALOG_QUERY_RETRY_ATTEMPTS = 3;
const CATALOG_QUERY_RETRY_DELAY_MS = 350;

const categorySelect = {
  id: true,
  name: true,
  slug: true,
  image: true,
} satisfies Prisma.CategorySelect;

const catalogProductInclude = {
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  promotions: {
    select: {
      id: true,
      name: true,
      discountPercent: true,
      discountFixed: true,
      active: true,
      startDate: true,
      endDate: true,
    },
  },
  coupons: {
    where: {
      coupon: {
        active: true,
      },
    },
    select: {
      coupon: {
        select: {
          id: true,
          code: true,
          discountPercent: true,
          active: true,
        },
      },
    },
  },
  stocks: {
    orderBy: [{ expirationDate: "asc" }, { receivedAt: "desc" }],
    select: {
      id: true,
      batch: true,
      quantity: true,
      reservedQuantity: true,
      minimumQuantity: true,
      expirationDate: true,
    },
  },
} satisfies Prisma.ProductInclude;

const productDetailInclude = {
  category: {
    select: {
      name: true,
      slug: true,
    },
  },
  promotions: {
    orderBy: {
      endDate: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      discountPercent: true,
      discountFixed: true,
      active: true,
      startDate: true,
      endDate: true,
    },
  },
  coupons: {
    where: {
      coupon: {
        active: true,
      },
    },
    select: {
      coupon: {
        select: {
          id: true,
          code: true,
          discountPercent: true,
          active: true,
        },
      },
    },
  },
  stocks: {
    orderBy: [{ expirationDate: "asc" }, { receivedAt: "desc" }],
    select: {
      id: true,
      batch: true,
      quantity: true,
      reservedQuantity: true,
      minimumQuantity: true,
      expirationDate: true,
      receivedAt: true,
    },
  },
} satisfies Prisma.ProductInclude;

export type CatalogCategory = Prisma.CategoryGetPayload<{
  select: typeof categorySelect;
}>;

type CatalogProductPayload = Prisma.ProductGetPayload<{
  include: typeof catalogProductInclude;
}>;

type ProductDetailPayload = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

export type CatalogProduct = Omit<CatalogProductPayload, "ean"> & {
  ean: string | null;
};

export type ProductDetail = Omit<ProductDetailPayload, "ean"> & {
  ean: string | null;
};

type ProductWithBigIntEan = {
  ean: bigint | null;
};

function serializeProductEan<Product extends ProductWithBigIntEan>(
  product: Product,
): Omit<Product, "ean"> & { ean: string | null } {
  return {
    ...product,
    ean: product.ean?.toString() ?? null,
  };
}

function getOrderBy(sort: string): Record<string, unknown> {
  if (sort === "name-asc") {
    return { name: "asc" };
  }

  if (sort === "price-asc") {
    return { price: "asc" };
  }

  if (sort === "price-desc") {
    return { price: "desc" };
  }

  if (sort === "stock-desc") {
    return { stock: "desc" };
  }

  return { createdAt: "desc" };
}

function isTransientPrismaConnectionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P1001" || error.code === "P1002")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withCatalogQueryRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CATALOG_QUERY_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !isTransientPrismaConnectionError(error) ||
        attempt === CATALOG_QUERY_RETRY_ATTEMPTS
      ) {
        throw error;
      }

      await wait(CATALOG_QUERY_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}

export const getCachedCatalogCategories = unstable_cache(
  async () =>
    withCatalogQueryRetry(() =>
      prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
        select: categorySelect,
      }),
    ),
  ["catalog-categories"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.catalogCategories],
  },
);

export const getCachedCatalogProductCount = unstable_cache(
  async (filters: ProductFilters) =>
    withCatalogQueryRetry(() =>
      prisma.product.count({
        where: buildProductWhere(filters),
      }),
    ),
  ["catalog-product-count"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.catalogProducts],
  },
);

export const getCachedCatalogProducts = unstable_cache(
  async ({
    filters,
    page,
    sort,
  }: {
    filters: ProductFilters;
    page: number;
    sort: string;
  }) => {
    const products = await withCatalogQueryRetry(() =>
      prisma.product.findMany({
        where: buildProductWhere(filters),
        include: catalogProductInclude,
        orderBy: getOrderBy(sort),
        skip: (page - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
      }),
    );

    return products.map(serializeProductEan);
  },
  ["catalog-products"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [
      CACHE_TAGS.catalogProducts,
      CACHE_TAGS.catalogPromotions,
      CACHE_TAGS.catalogStock,
    ],
  },
);

// Home shelves use a small payload; the full catalog keeps its existing contract.
const homeProductSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  imageUrl: true,
  active: true,
  stock: true,
  category: catalogProductInclude.category,
  promotions: catalogProductInclude.promotions,
} satisfies Prisma.ProductSelect;

export type HomeProduct = Prisma.ProductGetPayload<{
  select: typeof homeProductSelect;
}>;

export const getCachedHomeProducts = unstable_cache(
  async () => {
    const now = new Date();
    const available = { active: true, stock: { gt: 0 } };
    const [offers, highlights] = await Promise.all([
      withCatalogQueryRetry(() =>
        prisma.product.findMany({
          where: {
            ...available,
            promotions: {
              some: {
                active: true,
                startDate: { lte: now },
                endDate: { gte: now },
                OR: [
                  { discountPercent: { gt: 0 } },
                  { discountFixed: { gt: 0 } },
                ],
              },
            },
          },
          select: homeProductSelect,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 12,
        }),
      ),
      withCatalogQueryRetry(() =>
        prisma.product.findMany({
          where: available,
          select: homeProductSelect,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 8,
        }),
      ),
    ]);
    return { offers, highlights };
  },
  ["home-products"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [
      CACHE_TAGS.catalogProducts,
      CACHE_TAGS.catalogPromotions,
      CACHE_TAGS.catalogStock,
    ],
  },
);

export const getCachedProductBySlug = unstable_cache(
  async (slug: string) => {
    const product = await withCatalogQueryRetry(() =>
      prisma.product.findUnique({
        where: {
          slug,
        },
        include: productDetailInclude,
      }),
    );

    return product ? serializeProductEan(product) : null;
  },
  ["catalog-product-detail"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [
      CACHE_TAGS.catalogProducts,
      CACHE_TAGS.catalogPromotions,
      CACHE_TAGS.catalogStock,
    ],
  },
);

export const getCachedProductMetadataBySlug = unstable_cache(
  async (slug: string) =>
    withCatalogQueryRetry(() =>
      prisma.product.findUnique({
        where: {
          slug,
        },
        select: {
          name: true,
          description: true,
          imageUrl: true,
        },
      }),
    ),
  ["catalog-product-metadata"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.catalogProducts],
  },
);

export const getCachedActiveProductOptions = unstable_cache(
  async () =>
    withCatalogQueryRetry(() =>
      prisma.product.findMany({
        where: {
          active: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          price: true,
        },
      }),
    ),
  ["catalog-active-product-options"],
  {
    revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
    tags: [CACHE_TAGS.catalogProducts],
  },
);
