import { describe, expect, it } from "vitest";
import type { HomeProduct } from "./catalog-cache";
import { selectHomeProducts } from "./home-products";

const now = new Date("2026-09-17T12:00:00Z");
function product(id: string, discount = 0): HomeProduct {
  return {
    id,
    name: `Produto ${id}`,
    slug: `produto-${id}`,
    price: 100,
    imageUrl: null,
    active: true,
    stock: 10,
    category: null,
    promotions: discount
      ? [
          {
            id: `promo-${id}`,
            name: "Oferta",
            discountPercent: discount,
            discountFixed: 0,
            active: true,
            startDate: new Date("2026-09-01"),
            endDate: new Date("2026-09-30"),
          },
        ]
      : [],
  };
}

describe("selectHomeProducts", () => {
  it("orders real discounts and does not repeat offers in highlights", () => {
    const small = product("small", 10);
    const big = product("big", 30);
    const recent = product("recent");
    const result = selectHomeProducts(
      { offers: [small, big, recent], highlights: [big, recent] },
      now,
    );
    expect(result.offers.map(({ product }) => product.id)).toEqual([
      "big",
      "small",
    ]);
    expect(result.offers[0].pricing.finalPrice).toBe(70);
    expect(result.highlights.map(({ product }) => product.id)).toEqual([
      "recent",
    ]);
  });

  it("excludes expired and future promotions, inactive products and empty stock", () => {
    const expired = product("expired", 20);
    expired.promotions[0].endDate = new Date("2026-09-16");
    const future = product("future", 20);
    future.promotions[0].startDate = new Date("2026-09-18");
    const inactive = { ...product("inactive", 20), active: false };
    const empty = { ...product("empty", 20), stock: 0 };
    expect(
      selectHomeProducts(
        {
          offers: [expired, future, inactive, empty],
          highlights: [inactive, empty],
        },
        now,
      ),
    ).toEqual({ offers: [], highlights: [] });
  });

  it("limits each shelf to four without mutating candidates", () => {
    const offers = Array.from({ length: 8 }, (_, i) =>
      product(String(i), i + 1),
    );
    const original = [...offers];
    const highlights = Array.from({ length: 8 }, (_, i) => product(`new-${i}`));
    const result = selectHomeProducts({ offers, highlights }, now);
    expect(result.offers).toHaveLength(4);
    expect(result.highlights).toHaveLength(4);
    expect(offers).toEqual(original);
  });

  it("supports an empty catalog", () => {
    expect(selectHomeProducts({ offers: [], highlights: [] }, now)).toEqual({
      offers: [],
      highlights: [],
    });
  });
});
