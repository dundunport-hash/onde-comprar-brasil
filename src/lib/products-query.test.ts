import { describe, expect, it } from "vitest";
import {
  PRODUCTS_PER_PAGE,
  buildProductWhere,
  buildProductsHref,
  getProductFilters,
  getRequestedPage,
  getSafePage,
} from "./products-query";

describe("products query helpers", () => {
  it("normalizes filters from search params", () => {
    expect(
      getProductFilters({
        q: "  <b>amoxicilina</b>   500mg  ",
        categoryId: ["cat-1", "cat-2"],
        status: "active",
        stock: "available",
      }),
    ).toEqual({
      q: "amoxicilina 500mg",
      categoryId: "cat-1",
      status: "active",
      stock: "available",
    });
  });

  it("builds a Prisma where clause for search and filters", () => {
    expect(
      buildProductWhere({
        q: "dor",
        categoryId: "cat-1",
        status: "inactive",
        stock: "empty",
      }),
    ).toEqual({
      OR: [
        { name: { contains: "dor", mode: "insensitive" } },
        { slug: { contains: "dor", mode: "insensitive" } },
        { description: { contains: "dor", mode: "insensitive" } },
      ],
      categoryId: "cat-1",
      active: false,
      stock: 0,
    });
  });

  it("calculates safe pagination values", () => {
    expect(PRODUCTS_PER_PAGE).toBe(15);
    expect(getRequestedPage({ page: "-2" })).toBe(1);
    expect(getRequestedPage({ page: "3" })).toBe(3);
    expect(getSafePage(8, 23)).toEqual({
      currentPage: 2,
      totalPages: 2,
    });
    expect(getSafePage(1, 0)).toEqual({
      currentPage: 1,
      totalPages: 1,
    });
  });

  it.each(["1.5", "Infinity", "NaN", "0", "-3", "9007199254740992"])(
    "rejects invalid page %s",
    (page) => {
      expect(getRequestedPage({ page })).toBe(1);
    },
  );

  it("builds product list links without empty params", () => {
    expect(
      buildProductsHref({
        q: "vitamina c",
        categoryId: "",
        status: "active",
        stock: null,
        page: 2,
      }),
    ).toBe("/dashboard/produtos?q=vitamina+c&status=active&page=2");

    expect(buildProductsHref({ q: "", page: null })).toBe(
      "/dashboard/produtos",
    );

    expect(
      buildProductsHref(
        {
          q: "vitamina c",
          sort: "price-asc",
          page: 2,
        },
        "/",
      ),
    ).toBe("/?q=vitamina+c&sort=price-asc&page=2");
  });
});
