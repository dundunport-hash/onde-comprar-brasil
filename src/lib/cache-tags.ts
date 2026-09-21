import * as nextCache from "next/cache";

export const CACHE_TAGS = {
  catalogProducts: "catalog-products",
  catalogCategories: "catalog-categories",
  catalogPromotions: "catalog-promotions",
  catalogStock: "catalog-stock",
} as const;

const CATALOG_CACHE_TAGS = [
  CACHE_TAGS.catalogProducts,
  CACHE_TAGS.catalogCategories,
  CACHE_TAGS.catalogPromotions,
  CACHE_TAGS.catalogStock,
];

const CATALOG_REVALIDATE_PATHS: ReadonlyArray<{
  path: string;
  type?: "page" | "layout";
}> = [
  { path: "/" },
  { path: "/product/[slug]", type: "page" },
  { path: "/dashboard/produtos" },
  { path: "/dashboard/promocoes" },
  { path: "/dashboard/estoque" },
] as const;

export function invalidateCatalogCache() {
  if (typeof nextCache.revalidateTag !== "function") {
    return;
  }

  CATALOG_CACHE_TAGS.forEach((tag) => {
    nextCache.revalidateTag(tag, { expire: 0 });
  });
}

export function revalidateCatalogCache() {
  invalidateCatalogCache();

  if (typeof nextCache.revalidatePath !== "function") {
    return;
  }

  CATALOG_REVALIDATE_PATHS.forEach(({ path, type }) => {
    if (type) {
      nextCache.revalidatePath(path, type);
      return;
    }

    nextCache.revalidatePath(path);
  });
}
