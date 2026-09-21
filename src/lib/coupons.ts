import { type Coupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/pricing";

export type CouponValidationResult =
  | {
      status: "valid";
      coupon: Pick<Coupon, "id" | "code" | "discountPercent" | "active">;
      discountAmount: number;
      finalUnitPrice: number;
    }
  | {
      status:
        | "empty"
        | "not_found"
        | "inactive"
        | "invalid_percent"
        | "not_allowed";
      message: string;
    };

export function normalizeCouponCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function validateCouponPercent(value: number) {
  return Number.isFinite(value) && value >= 1 && value <= 100;
}

export function calculateCouponDiscount(unitPrice: number, percent: number) {
  const normalizedUnitPrice = roundMoney(unitPrice);

  if (!validateCouponPercent(percent) || normalizedUnitPrice <= 0) {
    return 0;
  }

  return Math.min(
    roundMoney(normalizedUnitPrice * (percent / 100)),
    normalizedUnitPrice,
  );
}

export async function validateCouponForProduct({
  codeValue,
  productId,
  unitPrice,
}: {
  codeValue: string;
  productId: string;
  unitPrice: number;
}): Promise<CouponValidationResult> {
  const code = normalizeCouponCode(codeValue);

  if (!code) {
    return {
      status: "empty",
      message: "Informe um cupom para aplicar.",
    };
  }

  const coupon = await prisma.coupon.findUnique({
    where: {
      code,
    },
    select: {
      id: true,
      code: true,
      discountPercent: true,
      active: true,
      products: {
        where: {
          productId,
        },
        select: {
          productId: true,
        },
        take: 1,
      },
    },
  });

  if (!coupon) {
    return {
      status: "not_found",
      message: "Cupom inexistente.",
    };
  }

  if (!coupon.active) {
    return {
      status: "inactive",
      message: "Cupom inativo.",
    };
  }

  if (!validateCouponPercent(coupon.discountPercent)) {
    return {
      status: "invalid_percent",
      message: "Cupom invalido.",
    };
  }

  if (coupon.products.length === 0) {
    return {
      status: "not_allowed",
      message: "Cupom nao permitido para este produto.",
    };
  }

  const discountAmount = calculateCouponDiscount(
    unitPrice,
    coupon.discountPercent,
  );

  return {
    status: "valid",
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      active: coupon.active,
    },
    discountAmount,
    finalUnitPrice: roundMoney(unitPrice - discountAmount),
  };
}
