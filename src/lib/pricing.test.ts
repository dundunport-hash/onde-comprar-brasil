import { describe, expect, it } from "vitest";
import {
  calculateCartTotals,
  calculateProductPricing,
  isPromotionActive,
  type PricePromotion,
} from "./pricing";

const activeWindow = {
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-12-31T23:59:59.999Z"),
};

function buildPromotion(
  overrides: Partial<PricePromotion> = {},
): PricePromotion {
  return {
    name: "Promocao",
    discountPercent: 0,
    discountFixed: 0,
    active: true,
    ...activeWindow,
    ...overrides,
  };
}

describe("pricing helpers", () => {
  it("checks promotion activity by status and date range", () => {
    const referenceDate = new Date("2026-05-17T12:00:00.000Z");

    expect(isPromotionActive(buildPromotion(), referenceDate)).toBe(true);
    expect(
      isPromotionActive(buildPromotion({ active: false }), referenceDate),
    ).toBe(false);
    expect(
      isPromotionActive(
        buildPromotion({
          startDate: new Date("2026-05-18T00:00:00.000Z"),
        }),
        referenceDate,
      ),
    ).toBe(false);
  });

  it("accumulates active discounts for a product", () => {
    const pricing = calculateProductPricing(
      100,
      [
        buildPromotion({ name: "10%", discountPercent: 10 }),
        buildPromotion({ name: "15%", discountPercent: 15 }),
      ],
      new Date("2026-05-17T12:00:00.000Z"),
    );

    expect(pricing).toEqual({
      basePrice: 100,
      finalPrice: 75,
      discount: 25,
      discountPercent: 25,
      promotionName: "10% + 15%",
    });
  });

  it("accumulates percent and fixed discounts from active promotions", () => {
    const pricing = calculateProductPricing(
      100,
      [
        buildPromotion({ name: "10%", discountPercent: 10 }),
        buildPromotion({ name: "R$ 5", discountFixed: 5 }),
      ],
      new Date("2026-05-17T12:00:00.000Z"),
    );

    expect(pricing).toMatchObject({
      finalPrice: 85,
      discount: 15,
      discountPercent: 15,
      promotionName: "10% + R$ 5",
    });
  });

  it("applies discounts when promotion dates were serialized", () => {
    const pricing = calculateProductPricing(
      100,
      [
        buildPromotion({
          discountPercent: 15,
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-12-31T23:59:59.999Z",
        }),
      ],
      new Date("2026-05-17T12:00:00.000Z"),
    );

    expect(pricing.finalPrice).toBe(85);
    expect(pricing.discountPercent).toBe(15);
  });

  it("does not allow discounts below zero", () => {
    expect(
      calculateProductPricing(
        20,
        [buildPromotion({ discountFixed: 999 })],
        new Date("2026-05-17T12:00:00.000Z"),
      ).finalPrice,
    ).toBe(0);
  });

  it("calculates cart totals from effective and original prices", () => {
    expect(
      calculateCartTotals([
        { quantity: 2, unitPrice: 8, baseUnitPrice: 10 },
        { quantity: 1, unitPrice: 5 },
      ]),
    ).toEqual({
      quantity: 3,
      subtotal: 21,
      originalSubtotal: 25,
      discountTotal: 4,
    });
  });
});
