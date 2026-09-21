"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { normalizeCouponCode, validateCouponPercent } from "@/lib/coupons";
import { prisma } from "@/lib/prisma";
import { calculateProductPricing } from "@/lib/pricing";
import { sanitizeText } from "@/lib/sanitize";

const COUPONS_PATH = "/dashboard/cupons";

function getString(formData: FormData, key: string) {
  return sanitizeText(formData.get(key), { maxLength: 80 });
}

function parseDiscountPercent(value: string) {
  const numberValue = Number(value.replace(/\./g, "").replace(",", "."));

  if (!validateCouponPercent(numberValue)) {
    throw new Error("Informe um percentual entre 1% e 100%.");
  }

  return numberValue;
}

function getProductIds(formData: FormData) {
  const productId = sanitizeText(formData.get("productId"), {
    maxLength: 120,
  });

  if (productId) {
    return [productId];
  }

  return formData
    .getAll("productIds")
    .map((value) => sanitizeText(value, { maxLength: 120 }))
    .filter(Boolean);
}

function revalidateCouponViews() {
  revalidatePath(COUPONS_PATH);
  revalidatePath("/");
  revalidatePath("/checkout/pagamento");
}

function handleCouponCreateOrUpdateError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new Error("Ja existe um cupom com este codigo.");
  }

  throw error;
}

export async function createCoupon(formData: FormData) {
  const session = await requireAdminSession();
  const code = normalizeCouponCode(getString(formData, "code"));
  const discountPercent = parseDiscountPercent(
    getString(formData, "discountPercent"),
  );

  if (!code) {
    throw new Error("Informe o codigo do cupom.");
  }

  const productIds = getProductIds(formData);

  if (productIds.length === 0) {
    throw new Error("Selecione pelo menos um produto para o cupom.");
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountPercent,
        active: formData.get("active") === "on",
        products: {
          create: productIds.map((productId) => ({
            productId,
          })),
        },
      },
    });

    await recordAuditLog({
      action: "coupon.create",
      entity: "Coupon",
      entityId: coupon.id,
      actor: getAuditActor(session),
      metadata: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        active: coupon.active,
        productIds,
      },
    });
  } catch (error) {
    handleCouponCreateOrUpdateError(error);
  }

  revalidateCouponViews();
  redirect(`${COUPONS_PATH}?created=1`);
}

export async function updateCoupon(formData: FormData) {
  const session = await requireAdminSession();
  const couponId = getString(formData, "couponId");
  const code = normalizeCouponCode(getString(formData, "code"));
  const discountPercent = parseDiscountPercent(
    getString(formData, "discountPercent"),
  );

  if (!couponId) {
    throw new Error("Cupom invalido.");
  }

  if (!code) {
    throw new Error("Informe o codigo do cupom.");
  }

  const productIds = getProductIds(formData);

  if (productIds.length === 0) {
    throw new Error("Selecione pelo menos um produto para o cupom.");
  }

  try {
    const coupon = await prisma.coupon.update({
      where: {
        id: couponId,
      },
      data: {
        code,
        discountPercent,
        active: formData.get("active") === "on",
        products: {
          deleteMany: {},
          create: productIds.map((productId) => ({
            productId,
          })),
        },
      },
    });

    await recordAuditLog({
      action: "coupon.update",
      entity: "Coupon",
      entityId: coupon.id,
      actor: getAuditActor(session),
      metadata: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        active: coupon.active,
        productIds,
      },
    });
  } catch (error) {
    handleCouponCreateOrUpdateError(error);
  }

  revalidateCouponViews();
  redirect(`${COUPONS_PATH}?updated=1`);
}

export async function toggleCoupon(formData: FormData) {
  const session = await requireAdminSession();
  const couponId = getString(formData, "couponId");
  const active = getString(formData, "active") === "true";

  if (!couponId) {
    throw new Error("Cupom invalido.");
  }

  const coupon = await prisma.coupon.update({
    where: {
      id: couponId,
    },
    data: {
      active,
    },
  });

  await recordAuditLog({
    action: "coupon.toggle",
    entity: "Coupon",
    entityId: coupon.id,
    actor: getAuditActor(session),
    metadata: {
      active: coupon.active,
    },
  });

  revalidateCouponViews();
  redirect(`${COUPONS_PATH}?updated=1`);
}

export async function deleteCoupon(formData: FormData) {
  const session = await requireAdminSession();
  const couponId = getString(formData, "couponId");

  if (!couponId) {
    throw new Error("Cupom invalido.");
  }

  const activeCartItems = await prisma.cartItem.findMany({
    where: {
      couponId,
      cart: {
        status: "ACTIVE",
      },
    },
    include: {
      product: {
        select: {
          price: true,
          promotions: {
            select: {
              name: true,
              discountPercent: true,
              discountFixed: true,
              active: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
    },
  });

  for (const item of activeCartItems) {
    const pricing = calculateProductPricing(
      item.product.price,
      item.product.promotions,
    );

    await prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        baseUnitPrice: pricing.finalPrice,
        unitPrice: pricing.finalPrice,
        couponId: null,
        couponCode: null,
        couponDiscountPercent: null,
        couponDiscountAmount: 0,
        couponFinalUnitPrice: null,
      },
    });
  }

  const coupon = await prisma.coupon.delete({
    where: {
      id: couponId,
    },
  });

  await recordAuditLog({
    action: "coupon.delete",
    entity: "Coupon",
    entityId: coupon.id,
    actor: getAuditActor(session),
    metadata: {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
    },
  });

  revalidateCouponViews();
  redirect(`${COUPONS_PATH}?deleted=1`);
}
