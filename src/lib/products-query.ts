import { sanitizeText } from "@/lib/sanitize";

export const PRODUCTS_PER_PAGE = 15;

export type ProductFilters = {
  q: string;
  categoryId: string;
  status: string;
  stock: string;
};

export type ProductSearchParams = {
  q?: string | string[];
  categoryId?: string | string[];
  status?: string | string[];
  stock?: string | string[];
  page?: string | string[];
  created?: string | string[];
  updated?: string | string[];
  deleted?: string | string[];
};

export function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function getProductFilters(searchParams: ProductSearchParams) {
  return {
    q: sanitizeText(getSingleParam(searchParams.q), { maxLength: 120 }),
    categoryId: sanitizeText(getSingleParam(searchParams.categoryId), {
      maxLength: 120,
    }),
    status: sanitizeText(getSingleParam(searchParams.status), {
      maxLength: 30,
    }),
    stock: sanitizeText(getSingleParam(searchParams.stock), { maxLength: 30 }),
  };
}

export function getRequestedPage(searchParams: ProductSearchParams) {
  const page = Number(getSingleParam(searchParams.page));
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function getSafePage(requestedPage: number, totalProducts: number) {
  const totalPages = Math.max(Math.ceil(totalProducts / PRODUCTS_PER_PAGE), 1);

  return {
    currentPage: Math.min(requestedPage, totalPages),
    totalPages,
  };
}

export function buildProductsHref(
  params: Record<string, string | number | null | undefined>,
  pathname = "/dashboard/produtos",
) {
  const urlSearchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      urlSearchParams.set(key, String(value));
    }
  });

  const queryString = urlSearchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function buildProductWhere(filters: ProductFilters) {
  const where: Record<string, unknown> = {};

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { slug: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.status === "active") {
    where.active = true;
  }

  if (filters.status === "inactive") {
    where.active = false;
  }

  if (filters.stock === "available") {
    where.stock = { gt: 0 };
  }

  if (filters.stock === "empty") {
    where.stock = 0;
  }

  return where;
}
