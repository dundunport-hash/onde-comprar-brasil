import { describe, expect, it } from "vitest";
import {
  calculateCouponDiscount,
  normalizeCouponCode,
  validateCouponPercent,
} from "./coupons";

describe("coupon helpers", () => {
  it("normalizes coupon codes for unique lookup", () => {
    expect(normalizeCouponCode(" saude 10 ")).toBe("SAUDE10");
  });

  it("validates coupon percent between 1 and 100", () => {
    expect(validateCouponPercent(1)).toBe(true);
    expect(validateCouponPercent(100)).toBe(true);
    expect(validateCouponPercent(0)).toBe(false);
    expect(validateCouponPercent(101)).toBe(false);
  });

  it("calculates the coupon discount from the product unit price", () => {
    expect(calculateCouponDiscount(89.9, 10)).toBe(8.99);
    expect(calculateCouponDiscount(50, 100)).toBe(50);
  });
});
