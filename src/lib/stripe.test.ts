import { describe, expect, it } from "vitest";
import { toStripeAmount } from "./stripe";

describe("stripe helpers", () => {
  it("converts BRL values to centavos", () => {
    expect(toStripeAmount(10)).toBe(1000);
    expect(toStripeAmount(12.345)).toBe(1235);
    expect(toStripeAmount(-5)).toBe(0);
  });
});
