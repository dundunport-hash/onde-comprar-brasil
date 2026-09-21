import { randomUUID } from "node:crypto";
import { CartStatus, type Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { calculateCartTotals, roundMoney } from "@/lib/pricing";
import {
  isDeliveryShippingMethod,
  isPickupShippingMethod,
} from "@/lib/shipping";

export const CART_COOKIE_NAME = "dmp_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const cartInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          imageUrl2: true,
          imageUrl3: true,
          price: true,
          stock: true,
          lengthCm: true,
          widthCm: true,
          heightCm: true,
          weightKg: true,
          active: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          promotions: {
            select: {
              id: true,
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
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.CartInclude;

export type PersistedCart = Prisma.CartGetPayload<{
  include: typeof cartInclude;
}>;

export function isControlledMedicationCategory(
  category:
    | {
        name?: string | null;
        slug?: string | null;
      }
    | null
    | undefined,
) {
  const normalizedSlug = category?.slug
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const normalizedName = category?.name
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    normalizedSlug === "medicamentos-controlados" ||
    normalizedSlug === "medicamento-controlado" ||
    normalizedName === "medicamentos controlados" ||
    normalizedName === "medicamento controlado" ||
    (Boolean(normalizedName?.includes("medicamento")) &&
      Boolean(normalizedName?.includes("controlado")))
  );
}

export function cartHasControlledMedication(cart: {
  items: Array<{
    product?: {
      category?: {
        name?: string | null;
        slug?: string | null;
      } | null;
    } | null;
  }>;
}) {
  return cart.items.some((item) =>
    isControlledMedicationCategory(item.product?.category),
  );
}

function getCartExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + CART_COOKIE_MAX_AGE);
  return expiresAt;
}

async function setCartCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export async function getCartCookieToken() {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE_NAME)?.value ?? null;
}

async function getActiveUserCart(userId: string) {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: CartStatus.ACTIVE,
    },
    include: cartInclude,
    orderBy: {
      updatedAt: "desc",
    },
  });
}

async function getActiveAnonymousCart(anonymousToken: string) {
  return prisma.cart.findFirst({
    where: {
      anonymousToken,
      status: CartStatus.ACTIVE,
    },
    include: cartInclude,
  });
}

async function getCartForRequest(userId?: string | null) {
  const anonymousToken = await getCartCookieToken();

  if (userId) {
    const [userCart, anonymousCart] = await Promise.all([
      getActiveUserCart(userId),
      anonymousToken ? getActiveAnonymousCart(anonymousToken) : null,
    ]);

    return userCart ?? anonymousCart;
  }

  if (!anonymousToken) {
    return null;
  }

  return getActiveAnonymousCart(anonymousToken);
}

export const getCart = cache(getCartForRequest);

async function mergeAnonymousCartIntoUserCart({
  anonymousCart,
  userCartId,
}: {
  anonymousCart: PersistedCart;
  userCartId: string;
}) {
  for (const item of anonymousCart.items) {
    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: userCartId,
          productId: item.productId,
        },
      },
      create: {
        cartId: userCartId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      },
      update: {
        quantity: {
          increment: item.quantity,
        },
      },
    });
  }

  await prisma.cart.update({
    where: {
      id: anonymousCart.id,
    },
    data: {
      status: CartStatus.ABANDONED,
      anonymousToken: null,
    },
  });
}

export async function getOrCreateCart(userId?: string | null) {
  const anonymousToken = await getCartCookieToken();

  if (userId) {
    const [existingUserCart, anonymousCart] = await Promise.all([
      getActiveUserCart(userId),
      anonymousToken ? getActiveAnonymousCart(anonymousToken) : null,
    ]);

    const userCart =
      existingUserCart ??
      (await prisma.cart.create({
        data: {
          userId,
          expiresAt: getCartExpirationDate(),
        },
        include: cartInclude,
      }));

    if (anonymousCart && anonymousCart.id !== userCart.id) {
      await mergeAnonymousCartIntoUserCart({
        anonymousCart,
        userCartId: userCart.id,
      });
    }

    return prisma.cart.findUniqueOrThrow({
      where: {
        id: userCart.id,
      },
      include: cartInclude,
    });
  }

  if (anonymousToken) {
    const existingCart = await getActiveAnonymousCart(anonymousToken);

    if (existingCart) {
      return existingCart;
    }
  }

  const nextToken = randomUUID();
  await setCartCookie(nextToken);

  return prisma.cart.create({
    data: {
      anonymousToken: nextToken,
      expiresAt: getCartExpirationDate(),
    },
    include: cartInclude,
  });
}

export function getCartSummary(cart: PersistedCart) {
  const itemTotals = calculateCartTotals(
    cart.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      baseUnitPrice: item.baseUnitPrice ?? item.product.price,
    })),
  );
  const hasCalculatedDeliveryShipping =
    !cartHasControlledMedication(cart) &&
    isDeliveryShippingMethod(cart.shippingMethod) &&
    Boolean(cart.shippingLabel) &&
    cart.shippingPrice != null &&
    cart.shippingCalculatedAt != null;
  const shippingTotal =
    isPickupShippingMethod(cart.shippingMethod) ||
    !hasCalculatedDeliveryShipping
      ? 0
      : roundMoney(cart.shippingPrice ?? 0);

  return {
    ...itemTotals,
    shippingTotal,
    total: roundMoney(itemTotals.subtotal + shippingTotal),
  };
}
