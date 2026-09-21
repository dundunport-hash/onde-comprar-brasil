import { describe, expect, it } from "vitest";
import {
  assertStockAvailability,
  getStockValidationIssue,
  validateCartStock,
} from "./stock-validation";

const baseProduct = {
  id: "product-1",
  name: "Dipirona",
  stock: 5,
  active: true,
};

describe("stock validation", () => {
  it("accepts active products with enough stock", () => {
    expect(
      getStockValidationIssue({
        quantity: 3,
        product: baseProduct,
      }),
    ).toBeNull();
  });

  it("reports inactive products", () => {
    expect(
      getStockValidationIssue({
        quantity: 1,
        product: {
          ...baseProduct,
          active: false,
        },
      })?.code,
    ).toBe("INACTIVE_PRODUCT");
  });

  it("reports unavailable and insufficient stock", () => {
    expect(
      getStockValidationIssue({
        quantity: 1,
        product: {
          ...baseProduct,
          stock: 0,
        },
      })?.code,
    ).toBe("OUT_OF_STOCK");

    expect(
      getStockValidationIssue({
        quantity: 6,
        product: baseProduct,
      })?.code,
    ).toBe("INSUFFICIENT_STOCK");
  });

  it("validates an entire cart", () => {
    expect(
      validateCartStock([
        {
          id: "item-1",
          quantity: 2,
          product: baseProduct,
        },
        {
          id: "item-2",
          quantity: 3,
          product: {
            ...baseProduct,
            id: "product-2",
            name: "Xarope",
            stock: 1,
          },
        },
      ]),
    ).toMatchObject({
      isValid: false,
      issues: [
        {
          itemId: "item-2",
          productId: "product-2",
          code: "INSUFFICIENT_STOCK",
        },
      ],
    });
  });

  it("throws a readable error when stock is invalid", () => {
    expect(() =>
      assertStockAvailability({
        quantity: 2,
        product: {
          ...baseProduct,
          stock: 1,
        },
      }),
    ).toThrow("Desse produto temos somente 1 unidade no estoque");
  });
});
