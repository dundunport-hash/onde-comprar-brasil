"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cartHasControlledMedication, getOrCreateCart } from "@/lib/cart";
import { validateCouponForProduct } from "@/lib/coupons";
import { prisma } from "@/lib/prisma";
import { calculateProductPricing } from "@/lib/pricing";
import { sanitizeText } from "@/lib/sanitize";
import {
  PICKUP_SHIPPING_LABEL,
  PICKUP_SHIPPING_METHOD,
  calculateShippingOptionsWithProviders,
  findShippingOption,
  validateShippingPostalCode,
  type ShippingMethod,
  type ShippingOption,
} from "@/lib/shipping";
import { assertStockAvailability } from "@/lib/stock-validation";

function parseQuantity(value: FormDataEntryValue | null) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Informe uma quantidade valida.");
  }

  return quantity;
}

async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

function revalidateCartViews() {
  revalidatePath("/");
  revalidatePath("/checkout/endereco");
  revalidatePath("/checkout/pagamento");
}

async function clearCalculatedShipping(cartId: string) {
  await prisma.cart.update({
    where: {
      id: cartId,
    },
    data: {
      shippingPostalCode: null,
      shippingMethod: null,
      shippingLabel: null,
      shippingPrice: null,
      shippingEstimatedDays: null,
      shippingCalculatedAt: null,
    },
  });
}

async function selectPickupShipping(cartId: string) {
  await prisma.cart.update({
    where: {
      id: cartId,
    },
    data: {
      shippingPostalCode: null,
      shippingMethod: PICKUP_SHIPPING_METHOD,
      shippingLabel: PICKUP_SHIPPING_LABEL,
      shippingPrice: 0,
      shippingEstimatedDays: null,
      shippingCalculatedAt: new Date(),
    },
  });
}

async function enforceControlledMedicationPickup(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: {
      id: cartId,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              category: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart || !cartHasControlledMedication(cart)) {
    return false;
  }

  await selectPickupShipping(cart.id);
  return true;
}

async function getActiveProductForCart(productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      active: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      active: true,
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
  });
}

export type ShippingCalculatorState = {
  status: "idle" | "success" | "error";
  message: string;
  fulfillmentMethod: "shipping" | "pickup";
  postalCode: string;
  selectedMethod: ShippingMethod;
  options: ShippingOption[];
};

export async function addCartItem(formData: FormData) {
  const productId = sanitizeText(formData.get("productId"), {
    maxLength: 120,
  });

  if (productId.length === 0) {
    throw new Error("Produto invalido.");
  }

  const quantity = parseQuantity(formData.get("quantity") ?? "1");
  const product = await getActiveProductForCart(productId);

  if (!product) {
    throw new Error("Produto nao encontrado.");
  }

  const cart = await getOrCreateCart(await getSessionUserId());
  const pricing = calculateProductPricing(product.price, product.promotions);
  const couponCode = sanitizeText(formData.get("couponCode"), {
    maxLength: 40,
  });
  const couponValidation = couponCode
    ? await validateCouponForProduct({
        codeValue: couponCode,
        productId: product.id,
        unitPrice: pricing.finalPrice,
      })
    : null;

  if (couponValidation && couponValidation.status !== "valid") {
    throw new Error(couponValidation.message);
  }

  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: product.id,
      },
    },
    select: {
      quantity: true,
      couponId: true,
      couponCode: true,
      couponDiscountPercent: true,
      couponDiscountAmount: true,
      couponFinalUnitPrice: true,
      baseUnitPrice: true,
      unitPrice: true,
    },
  });

  if (
    couponValidation?.status === "valid" &&
    existingItem?.couponId === couponValidation.coupon.id
  ) {
    throw new Error("Este cupom ja esta aplicado a este produto.");
  }

  const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
  const finalUnitPrice =
    couponValidation?.status === "valid"
      ? couponValidation.finalUnitPrice
      : existingItem?.couponId
        ? existingItem.unitPrice
        : pricing.finalPrice;

  assertStockAvailability({
    quantity: nextQuantity,
    product,
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: product.id,
      },
    },
    create: {
      cartId: cart.id,
      productId: product.id,
      quantity,
      baseUnitPrice: pricing.finalPrice,
      unitPrice: finalUnitPrice,
      couponId:
        couponValidation?.status === "valid"
          ? couponValidation.coupon.id
          : null,
      couponCode:
        couponValidation?.status === "valid"
          ? couponValidation.coupon.code
          : null,
      couponDiscountPercent:
        couponValidation?.status === "valid"
          ? couponValidation.coupon.discountPercent
          : null,
      couponDiscountAmount:
        couponValidation?.status === "valid"
          ? couponValidation.discountAmount
          : 0,
      couponFinalUnitPrice:
        couponValidation?.status === "valid"
          ? couponValidation.finalUnitPrice
          : null,
    },
    update: {
      quantity: {
        increment: quantity,
      },
      ...(couponValidation?.status === "valid"
        ? {
            baseUnitPrice: pricing.finalPrice,
            unitPrice: finalUnitPrice,
            couponId: couponValidation.coupon.id,
            couponCode: couponValidation.coupon.code,
            couponDiscountPercent: couponValidation.coupon.discountPercent,
            couponDiscountAmount: couponValidation.discountAmount,
            couponFinalUnitPrice: couponValidation.finalUnitPrice,
          }
        : existingItem?.couponId
          ? {}
          : {
              baseUnitPrice: pricing.finalPrice,
              unitPrice: finalUnitPrice,
              couponId: null,
              couponCode: null,
              couponDiscountPercent: null,
              couponDiscountAmount: 0,
              couponFinalUnitPrice: null,
            }),
    },
  });
  const forcedPickup = await enforceControlledMedicationPickup(cart.id);

  if (!forcedPickup) {
    await clearCalculatedShipping(cart.id);
  }

  revalidateCartViews();
}

export async function updateCartItem(formData: FormData) {
  const cartItemId = sanitizeText(formData.get("cartItemId"), {
    maxLength: 120,
  });

  if (cartItemId.length === 0) {
    throw new Error("Item invalido.");
  }

  const quantity = parseQuantity(formData.get("quantity"));
  const cart = await getOrCreateCart(await getSessionUserId());
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: cartItemId,
      cartId: cart.id,
    },
    select: {
      product: {
        select: {
          id: true,
          name: true,
          stock: true,
          active: true,
        },
      },
    },
  });

  if (!cartItem) {
    throw new Error("Item nao encontrado.");
  }

  assertStockAvailability({
    quantity,
    product: cartItem.product,
  });

  await prisma.cartItem.update({
    where: {
      id: cartItemId,
      cartId: cart.id,
    },
    data: {
      quantity,
    },
  });
  const forcedPickup = await enforceControlledMedicationPickup(cart.id);

  if (!forcedPickup) {
    await clearCalculatedShipping(cart.id);
  }

  revalidateCartViews();
}

export async function removeCartItem(formData: FormData) {
  const cartItemId = sanitizeText(formData.get("cartItemId"), {
    maxLength: 120,
  });

  if (cartItemId.length === 0) {
    throw new Error("Item invalido.");
  }

  const cart = await getOrCreateCart(await getSessionUserId());

  await prisma.cartItem.delete({
    where: {
      id: cartItemId,
      cartId: cart.id,
    },
  });
  const forcedPickup = await enforceControlledMedicationPickup(cart.id);

  if (!forcedPickup) {
    await clearCalculatedShipping(cart.id);
  }

  revalidateCartViews();
}

export async function clearCart() {
  const cart = await getOrCreateCart(await getSessionUserId());

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });
  await clearCalculatedShipping(cart.id);

  revalidateCartViews();
}

export async function saveControlledMedicationPrescription(formData: FormData) {
  const prescriptionImageUrl = sanitizeText(
    formData.get("prescriptionImageUrl"),
    { maxLength: 500 },
  );
  const cart = await getOrCreateCart(await getSessionUserId());

  if (!cartHasControlledMedication(cart)) {
    throw new Error("A receita so e necessaria para medicamentos controlados.");
  }

  await prisma.cart.update({
    where: {
      id: cart.id,
    },
    data: {
      prescriptionImageUrl: prescriptionImageUrl || null,
      prescriptionUploadedAt: prescriptionImageUrl ? new Date() : null,
    },
  });
  await selectPickupShipping(cart.id);

  revalidateCartViews();
}

export async function calculateCartShipping(
  previousState: ShippingCalculatorState,
  formData: FormData,
): Promise<ShippingCalculatorState> {
  const fulfillmentMethodValue = formData.get("fulfillmentMethod");
  const fulfillmentMethod =
    fulfillmentMethodValue === "pickup" ? "pickup" : "shipping";
  const postalCodeValue = formData.get("postalCode");
  const methodValue = formData.get("shippingMethod");
  const postalCode = sanitizeText(postalCodeValue, { maxLength: 20 });
  const selectedMethod =
    typeof methodValue === "string" && methodValue.length > 0
      ? sanitizeText(methodValue, { maxLength: 120 })
      : previousState.selectedMethod;

  if (fulfillmentMethod === "pickup") {
    const cart = await getOrCreateCart(await getSessionUserId());

    if (cart.items.length === 0) {
      return {
        ...previousState,
        status: "error",
        fulfillmentMethod,
        message: "Adicione produtos ao carrinho para escolher a retirada.",
      };
    }

    await prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        shippingPostalCode: null,
        shippingMethod: PICKUP_SHIPPING_METHOD,
        shippingLabel: PICKUP_SHIPPING_LABEL,
        shippingPrice: 0,
        shippingEstimatedDays: null,
        shippingCalculatedAt: new Date(),
      },
    });

    revalidateCartViews();

    return {
      status: "success",
      fulfillmentMethod,
      message: "Retirada na loja selecionada.",
      postalCode: "",
      selectedMethod,
      options: [],
    };
  }

  const postalCodeValidation = validateShippingPostalCode(postalCode);

  if (!postalCodeValidation.isValid) {
    return {
      ...previousState,
      status: "error",
      fulfillmentMethod,
      message: postalCodeValidation.error,
      postalCode: postalCodeValidation.postalCode,
    };
  }

  const cart = await getOrCreateCart(await getSessionUserId());

  if (cart.items.length === 0) {
    return {
      ...previousState,
      status: "error",
      fulfillmentMethod,
      message: "Adicione produtos ao carrinho para calcular o frete.",
      postalCode: postalCodeValidation.postalCode,
    };
  }

  if (cartHasControlledMedication(cart)) {
    await selectPickupShipping(cart.id);
    revalidateCartViews();

    return {
      status: "success",
      fulfillmentMethod: "pickup",
      message:
        "Medicamentos controlados exigem receita e retirada obrigatoria na loja.",
      postalCode: "",
      selectedMethod,
      options: [],
    };
  }

  const summary = cart.items.reduce(
    (totals, item) => ({
      quantity: totals.quantity + item.quantity,
      subtotal: totals.subtotal + item.quantity * item.unitPrice,
    }),
    { quantity: 0, subtotal: 0 },
  );
  let options: ShippingOption[];

  try {
    options = await calculateShippingOptionsWithProviders({
      postalCode: postalCodeValidation.postalCode,
      subtotal: summary.subtotal,
      quantity: summary.quantity,
      items: cart.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lengthCm: item.product?.lengthCm,
        widthCm: item.product?.widthCm,
        heightCm: item.product?.heightCm,
        weightKg: item.product?.weightKg,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel calcular o frete.";

    console.error("Falha ao calcular frete.", message);

    return {
      ...previousState,
      status: "error",
      fulfillmentMethod,
      message: `Nao foi possivel calcular o frete pelos provedores disponiveis: ${message}`,
      postalCode: postalCodeValidation.postalCode,
    };
  }

  const selectedOption = findShippingOption(options, selectedMethod);

  await prisma.cart.update({
    where: {
      id: cart.id,
    },
    data: {
      shippingPostalCode: postalCodeValidation.postalCode,
      shippingMethod: selectedOption.method,
      shippingLabel: selectedOption.label,
      shippingPrice: selectedOption.price,
      shippingEstimatedDays: selectedOption.estimatedDays,
      shippingCalculatedAt: new Date(),
    },
  });

  revalidateCartViews();

  return {
    status: "success",
    message: `${selectedOption.label} adicionada ao carrinho.`,
    fulfillmentMethod,
    postalCode: postalCodeValidation.postalCode,
    selectedMethod: selectedOption.method,
    options,
  };
}
