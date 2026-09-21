import { StockMovementType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getMovementQuantity,
  getNewStockQuantity,
  isExpired,
  isExpiringSoon,
} from "./stock";

describe("stock helpers", () => {
  it("increases quantity for incoming movements", () => {
    expect(
      getNewStockQuantity({
        type: StockMovementType.IN,
        currentQuantity: 10,
        quantity: 5,
      }),
    ).toBe(15);

    expect(
      getNewStockQuantity({
        type: StockMovementType.RETURN,
        currentQuantity: 10,
        quantity: 2,
      }),
    ).toBe(12);
  });

  it("decreases quantity for outgoing movements", () => {
    expect(
      getNewStockQuantity({
        type: StockMovementType.OUT,
        currentQuantity: 10,
        quantity: 4,
      }),
    ).toBe(6);

    expect(
      getNewStockQuantity({
        type: StockMovementType.LOSS,
        currentQuantity: 10,
        quantity: 3,
      }),
    ).toBe(7);

    expect(
      getNewStockQuantity({
        type: StockMovementType.EXPIRED,
        currentQuantity: 10,
        quantity: 10,
      }),
    ).toBe(0);
  });

  it("blocks negative stock", () => {
    expect(() =>
      getNewStockQuantity({
        type: StockMovementType.OUT,
        currentQuantity: 2,
        quantity: 3,
      }),
    ).toThrow("Estoque insuficiente");
  });

  it("uses adjustment as the new absolute quantity", () => {
    expect(
      getNewStockQuantity({
        type: StockMovementType.ADJUSTMENT,
        currentQuantity: 10,
        quantity: 7,
      }),
    ).toBe(7);

    expect(
      getMovementQuantity({
        type: StockMovementType.ADJUSTMENT,
        currentQuantity: 10,
        quantity: 7,
      }),
    ).toBe(3);
  });

  it("identifies expired and expiring stock", () => {
    const today = new Date("2026-05-10T12:00:00");

    expect(isExpired(new Date("2026-05-09T00:00:00"), today)).toBe(true);
    expect(isExpired(new Date("2026-05-10T00:00:00"), today)).toBe(false);
    expect(isExpiringSoon(new Date("2026-06-01T00:00:00"), today)).toBe(true);
    expect(isExpiringSoon(new Date("2026-07-01T00:00:00"), today)).toBe(false);
  });
});
