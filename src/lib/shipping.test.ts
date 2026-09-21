import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/melhor-envio", () => ({
  calculateMelhorEnvioShippingOptions: vi.fn(),
}));

import { calculateMelhorEnvioShippingOptions } from "@/lib/melhor-envio";
import {
  calculateShippingOptions,
  calculateShippingOptionsWithProviders,
  findShippingOption,
  validateShippingPostalCode,
} from "./shipping";

const mockedCalculateMelhorEnvioShippingOptions = vi.mocked(
  calculateMelhorEnvioShippingOptions,
);

describe("shipping helpers", () => {
  it("validates and normalizes postal codes", () => {
    expect(validateShippingPostalCode("01001-000")).toEqual({
      postalCode: "01001000",
      isValid: true,
      error: "",
    });
    expect(validateShippingPostalCode("123")).toMatchObject({
      postalCode: "123",
      isValid: false,
    });
  });

  it("calculates standard and express options", () => {
    expect(
      calculateShippingOptions({
        postalCode: "01001000",
        subtotal: 80,
        quantity: 2,
      }),
    ).toEqual([
      {
        method: "standard",
        label: "Entrega padrao",
        price: 15,
        estimatedDays: 2,
      },
      {
        method: "express",
        label: "Entrega expressa",
        price: 27.9,
        estimatedDays: 1,
      },
    ]);
  });

  it("charges standard shipping for larger carts", () => {
    expect(
      calculateShippingOptions({
        postalCode: "01001000",
        subtotal: 150,
        quantity: 1,
      })[0].price,
    ).toBe(13.5);
  });

  it("finds the selected shipping option or falls back to standard", () => {
    const options = calculateShippingOptions({
      postalCode: "01001000",
      subtotal: 80,
      quantity: 1,
    });

    expect(findShippingOption(options, "express")?.method).toBe("express");
    expect(findShippingOption(options, "unknown")?.method).toBe("standard");
  });

  it("uses Melhor Envio for provider shipping quotes", async () => {
    mockedCalculateMelhorEnvioShippingOptions.mockResolvedValueOnce([
      {
        method: "standard",
        label: "Jadlog - Package",
        price: 22.34,
        estimatedDays: 4,
      },
    ]);

    await expect(
      calculateShippingOptionsWithProviders({
        postalCode: "20040002",
        subtotal: 80,
        quantity: 2,
      }),
    ).resolves.toEqual([
      {
        method: "standard",
        label: "Jadlog - Package",
        price: 22.34,
        estimatedDays: 4,
      },
    ]);
    expect(mockedCalculateMelhorEnvioShippingOptions).toHaveBeenCalledWith({
      postalCode: "20040002",
      subtotal: 80,
      quantity: 2,
    });
  });
});
