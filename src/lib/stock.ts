import { StockMovementType } from "@prisma/client";

const INCREASE_MOVEMENTS = new Set<StockMovementType>([
  StockMovementType.IN,
  StockMovementType.RETURN,
]);

const DECREASE_MOVEMENTS = new Set<StockMovementType>([
  StockMovementType.OUT,
  StockMovementType.LOSS,
  StockMovementType.EXPIRED,
]);

export function getNewStockQuantity({
  type,
  currentQuantity,
  quantity,
}: {
  type: StockMovementType;
  currentQuantity: number;
  quantity: number;
}) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Informe uma quantidade valida.");
  }

  if (type === StockMovementType.ADJUSTMENT) {
    return quantity;
  }

  if (INCREASE_MOVEMENTS.has(type)) {
    return currentQuantity + quantity;
  }

  if (DECREASE_MOVEMENTS.has(type)) {
    const newQuantity = currentQuantity - quantity;

    if (newQuantity < 0) {
      throw new Error("Estoque insuficiente para esta movimentacao.");
    }

    return newQuantity;
  }

  return currentQuantity;
}

export function getMovementQuantity({
  type,
  currentQuantity,
  quantity,
}: {
  type: StockMovementType;
  currentQuantity: number;
  quantity: number;
}) {
  if (type === StockMovementType.ADJUSTMENT) {
    return Math.abs(quantity - currentQuantity);
  }

  return quantity;
}

export function isExpired(expirationDate: Date | null, today = new Date()) {
  if (!expirationDate) {
    return false;
  }

  const expirationDay = new Date(expirationDate);
  expirationDay.setHours(23, 59, 59, 999);

  return expirationDay < today;
}

export function isExpiringSoon(
  expirationDate: Date | null,
  today = new Date(),
  days = 30,
) {
  if (!expirationDate || isExpired(expirationDate, today)) {
    return false;
  }

  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() + days);

  return expirationDate <= limitDate;
}
