import { describe, expect, it } from "vitest";
import {
  cartHasControlledMedication,
  getCartSummary,
  isControlledMedicationCategory,
  type PersistedCart,
} from "./cart";

describe("cart helpers", () => {
  it("calculates quantity, subtotal and discount totals", () => {
    const cart = {
      items: [
        {
          quantity: 2,
          unitPrice: 8,
          product: {
            price: 10,
          },
        },
        {
          quantity: 1,
          unitPrice: 5,
          product: {
            price: 5,
          },
        },
      ],
    } as unknown as PersistedCart;

    expect(getCartSummary(cart)).toEqual({
      quantity: 3,
      subtotal: 21,
      originalSubtotal: 25,
      discountTotal: 4,
      shippingTotal: 0,
      total: 21,
    });
  });

  it("includes item coupon discounts in the cart discount total", () => {
    const cart = {
      items: [
        {
          quantity: 2,
          baseUnitPrice: 25,
          unitPrice: 20,
          couponCode: "SAUDE10",
          couponDiscountPercent: 20,
          couponDiscountAmount: 5,
          product: {
            price: 25,
          },
        },
      ],
    } as unknown as PersistedCart;

    expect(getCartSummary(cart)).toMatchObject({
      originalSubtotal: 50,
      subtotal: 40,
      discountTotal: 10,
      total: 40,
    });
  });

  it("adds shipping to the cart total", () => {
    const cart = {
      shippingMethod: "standard",
      shippingLabel: "Entrega padrao",
      shippingPrice: 12.5,
      shippingCalculatedAt: new Date("2026-06-25T12:00:00.000Z"),
      items: [
        {
          quantity: 1,
          unitPrice: 20,
          product: {
            price: 20,
          },
        },
      ],
    } as unknown as PersistedCart;

    expect(getCartSummary(cart)).toMatchObject({
      subtotal: 20,
      shippingTotal: 12.5,
      total: 32.5,
    });
  });

  it("does not add shipping before a delivery option is calculated", () => {
    const cart = {
      shippingPrice: 12.5,
      items: [
        {
          quantity: 1,
          unitPrice: 20,
          product: {
            price: 20,
          },
        },
      ],
    } as unknown as PersistedCart;

    expect(getCartSummary(cart)).toMatchObject({
      subtotal: 20,
      shippingTotal: 0,
      total: 20,
    });
  });

  it("does not add shipping when pickup in store is selected", () => {
    const cart = {
      shippingMethod: "pickup",
      shippingPrice: 13.5,
      items: [
        {
          quantity: 1,
          unitPrice: 20,
          product: {
            price: 20,
          },
        },
      ],
    } as unknown as PersistedCart;

    expect(getCartSummary(cart)).toMatchObject({
      subtotal: 20,
      shippingTotal: 0,
      total: 20,
    });
  });

  it("identifies controlled medication categories with common variations", () => {
    expect(
      isControlledMedicationCategory({
        name: "Medicamento Controlado",
        slug: "medicamento-controlado",
      }),
    ).toBe(true);
    expect(
      isControlledMedicationCategory({
        name: "Medicamentos Controlados",
        slug: "medicamentos-controlados",
      }),
    ).toBe(true);
    expect(
      isControlledMedicationCategory({
        name: "Medicamentos controlados",
        slug: "remedios-especiais",
      }),
    ).toBe(true);
    expect(
      isControlledMedicationCategory({
        name: "Vitaminas",
        slug: "vitaminas",
      }),
    ).toBe(false);
  });

  it("detects controlled medication products in the cart", () => {
    const cart = {
      items: [
        {
          product: {
            category: {
              name: "Medicamentos Controlados",
              slug: "medicamentos-controlados",
            },
          },
        },
      ],
    };

    expect(cartHasControlledMedication(cart)).toBe(true);
  });
});
