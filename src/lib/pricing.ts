export type PricePromotion = {
  id?: string;
  name: string;
  discountPercent: number;
  discountFixed: number;
  active: boolean;
  startDate: Date | string | number;
  endDate: Date | string | number;
};

export type ProductPricing = {
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountPercent: number;
  promotionName: string | null;
};

export type CartCalculationItem = {
  quantity: number;
  unitPrice: number;
  baseUnitPrice?: number | null;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function clampMoney(value: number) {
  return Math.max(roundMoney(value), 0);
}

function parsePromotionDate(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function isPromotionActive(
  promotion: PricePromotion,
  referenceDate = new Date(),
) {
  const startDate = parsePromotionDate(promotion.startDate);
  const endDate = parsePromotionDate(promotion.endDate);

  return (
    promotion.active &&
    startDate !== null &&
    endDate !== null &&
    startDate <= referenceDate &&
    endDate >= referenceDate
  );
}

export function calculateProductPricing(
  basePrice: number,
  promotions: PricePromotion[] = [],
  referenceDate = new Date(),
): ProductPricing {
  const normalizedBasePrice = clampMoney(basePrice);
  const activePromotions = promotions.filter((promotion) =>
    isPromotionActive(promotion, referenceDate),
  );

  if (activePromotions.length === 0) {
    return {
      basePrice: normalizedBasePrice,
      finalPrice: normalizedBasePrice,
      discount: 0,
      discountPercent: 0,
      promotionName: null,
    };
  }

  const totalDiscountPercent = activePromotions.reduce(
    (total, promotion) => total + Math.max(promotion.discountPercent, 0),
    0,
  );
  const totalFixedDiscount = activePromotions.reduce(
    (total, promotion) => total + Math.max(promotion.discountFixed, 0),
    0,
  );
  const totalDiscount = clampMoney(
    normalizedBasePrice * (totalDiscountPercent / 100) + totalFixedDiscount,
  );
  const discount = Math.min(totalDiscount, normalizedBasePrice);

  return {
    basePrice: normalizedBasePrice,
    finalPrice: clampMoney(normalizedBasePrice - discount),
    discount,
    discountPercent:
      normalizedBasePrice > 0
        ? roundMoney((discount / normalizedBasePrice) * 100)
        : 0,
    promotionName: activePromotions
      .map((promotion) => promotion.name)
      .join(" + "),
  };
}

export function calculateCartTotals(items: CartCalculationItem[]) {
  return items.reduce(
    (summary, item) => {
      const quantity = Math.max(item.quantity, 0);
      const unitPrice = clampMoney(item.unitPrice);
      const baseUnitPrice = clampMoney(item.baseUnitPrice ?? unitPrice);
      const lineSubtotal = roundMoney(quantity * unitPrice);
      const lineOriginalSubtotal = roundMoney(quantity * baseUnitPrice);
      const lineDiscount = clampMoney(lineOriginalSubtotal - lineSubtotal);

      return {
        quantity: summary.quantity + quantity,
        subtotal: roundMoney(summary.subtotal + lineSubtotal),
        originalSubtotal: roundMoney(
          summary.originalSubtotal + lineOriginalSubtotal,
        ),
        discountTotal: roundMoney(summary.discountTotal + lineDiscount),
      };
    },
    {
      quantity: 0,
      subtotal: 0,
      originalSubtotal: 0,
      discountTotal: 0,
    },
  );
}
