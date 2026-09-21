import {
  CartStatus,
  PaymentStatus,
  StockMovementType,
  type Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";
import { revalidateCatalogCache } from "@/lib/cache-tags";
import { createMelhorEnvioShipment } from "@/lib/melhor-envio";
import { prisma } from "@/lib/prisma";
import { isPickupShippingMethod } from "@/lib/shipping";

type CheckoutPaymentPayload = {
  cartId?: string | null;
  userId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  mercadoPagoPaymentId?: string | null;
};

type FulfillmentTx = Prisma.TransactionClient;

type CheckoutCart = NonNullable<
  Awaited<ReturnType<typeof findCheckoutCartForFulfillment>>
>;

const FULFILLMENT_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
};

function buildCartLookup({
  cartId,
  stripeCheckoutSessionId,
  mercadoPagoPaymentId,
}: CheckoutPaymentPayload): Prisma.CartWhereInput {
  if (cartId) {
    return {
      id: cartId,
      ...(stripeCheckoutSessionId ? { stripeCheckoutSessionId } : {}),
      ...(mercadoPagoPaymentId ? { mercadoPagoPaymentId } : {}),
    };
  }

  if (stripeCheckoutSessionId) {
    return {
      stripeCheckoutSessionId,
    };
  }

  return {
    mercadoPagoPaymentId,
  };
}

async function findCheckoutCartForFulfillment(
  tx: FulfillmentTx,
  payload: CheckoutPaymentPayload,
) {
  return tx.cart.findFirst({
    where: buildCartLookup(payload),
    include: {
      checkoutAddress: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              active: true,
              stock: true,
              lengthCm: true,
              widthCm: true,
              heightCm: true,
              weightKg: true,
            },
          },
        },
      },
    },
  });
}

function toShippingJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function ensureMelhorEnvioShipmentForPaidCart(cartId: string) {
  const cart = await prisma.cart.findFirst({
    where: {
      id: cartId,
      paymentStatus: PaymentStatus.PAID,
      paidAt: {
        not: null,
      },
    },
    include: {
      checkoutAddress: true,
      items: {
        include: {
          product: {
            select: {
              name: true,
              lengthCm: true,
              widthCm: true,
              heightCm: true,
              weightKg: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return { created: false, reason: "cart-not-paid" as const };
  }

  if (isPickupShippingMethod(cart.shippingMethod)) {
    return { created: false, reason: "pickup" as const };
  }

  if (cart.shipmentId) {
    return { created: false, reason: "already-created" as const };
  }

  if (!cart.checkoutAddress) {
    return { created: false, reason: "address-missing" as const };
  }

  if (!cart.checkoutAddress.document) {
    return { created: false, reason: "address-document-missing" as const };
  }

  if (!cart.shippingMethod || cart.shippingPrice == null) {
    return { created: false, reason: "shipping-missing" as const };
  }

  const payload = {
    cartId: cart.id,
    method: cart.shippingMethod,
    shippingPrice: cart.shippingPrice,
    recipient: {
      name: cart.checkoutAddress.fullName,
      document: cart.checkoutAddress.document,
      phone: cart.checkoutAddress.phone,
      postalCode: cart.checkoutAddress.postalCode,
      street: cart.checkoutAddress.street,
      number: cart.checkoutAddress.number,
      complement: cart.checkoutAddress.complement,
      neighborhood: cart.checkoutAddress.neighborhood,
      city: cart.checkoutAddress.city,
      state: cart.checkoutAddress.state,
    },
    items: cart.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lengthCm: item.product.lengthCm,
      widthCm: item.product.widthCm,
      heightCm: item.product.heightCm,
      weightKg: item.product.weightKg,
    })),
  };

  try {
    const shipment = await createMelhorEnvioShipment(payload);

    if (!shipment.id) {
      throw new Error("Melhor Envio nao retornou o ID do envio.");
    }

    const update = await prisma.cart.updateMany({
      where: {
        id: cart.id,
        shipmentId: null,
      },
      data: {
        shipmentId: shipment.id,
        shipmentTrackingCode: shipment.trackingCode,
        shipmentLabelRequestId: shipment.labelRequestId,
        shipmentStatus: "created",
        shipmentError: null,
        shipmentPayload: toShippingJson(payload),
        shipmentResponse: toShippingJson({
          cart: shipment.rawCart,
          checkout: shipment.rawCheckout,
          generate: shipment.rawGenerate,
          print: shipment.rawPrint,
        }),
        shipmentCreatedAt: new Date(),
        shipmentLabelRequestedAt: shipment.labelRequestId ? new Date() : null,
      },
    });

    if (update.count === 0) {
      return { created: false, reason: "already-created" as const };
    }

    await recordAuditLog({
      action: "melhor_envio.shipment.create",
      entity: "Cart",
      entityId: cart.id,
      metadata: {
        shipmentId: shipment.id,
        trackingCode: shipment.trackingCode,
        labelUrl: shipment.labelRequestId,
      },
    });

    return { created: true, reason: "created" as const };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel gerar a etiqueta pelo Melhor Envio.";

    await prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        shipmentStatus: "failed",
        shipmentError: message,
        shipmentPayload: toShippingJson(payload),
      },
    });

    await recordAuditLog({
      action: "melhor_envio.shipment.failed",
      entity: "Cart",
      entityId: cart.id,
      metadata: {
        error: message,
      },
    });

    return { created: false, reason: "failed" as const, message };
  }
}

async function ensureLegacyStockLot({
  tx,
  productId,
  productStockBeforeSale,
  stockLots,
}: {
  tx: FulfillmentTx;
  productId: string;
  productStockBeforeSale: number;
  stockLots: Array<{
    id: string;
    productId: string;
    quantity: number;
    batch: string | null;
    expirationDate: Date | null;
  }>;
}) {
  const lotTotal = stockLots.reduce((total, lot) => total + lot.quantity, 0);
  const legacyQuantity = productStockBeforeSale - lotTotal;

  if (legacyQuantity <= 0) {
    return stockLots;
  }

  const legacyLot = await tx.stock.create({
    data: {
      productId,
      batch: "LEGADO",
      quantity: legacyQuantity,
    },
  });

  return [...stockLots, legacyLot];
}

async function deductProductStock({
  tx,
  cart,
  productId,
  productName,
  productStockBeforeSale,
  quantity,
}: {
  tx: FulfillmentTx;
  cart: CheckoutCart;
  productId: string;
  productName: string;
  productStockBeforeSale: number;
  quantity: number;
}) {
  const stockUpdate = await tx.product.updateMany({
    where: {
      id: productId,
      active: true,
      stock: {
        gte: quantity,
      },
    },
    data: {
      stock: {
        decrement: quantity,
      },
    },
  });

  if (stockUpdate.count !== 1) {
    throw new Error(`Estoque insuficiente para ${productName}.`);
  }

  const initialStockLots = await tx.stock.findMany({
    where: {
      productId,
      quantity: {
        gt: 0,
      },
    },
    orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
  });
  const stockLots = await ensureLegacyStockLot({
    tx,
    productId,
    productStockBeforeSale,
    stockLots: initialStockLots,
  });

  let remainingQuantity = quantity;

  for (const stockLot of stockLots) {
    if (remainingQuantity === 0) {
      break;
    }

    const deductedQuantity = Math.min(stockLot.quantity, remainingQuantity);
    const nextQuantity = stockLot.quantity - deductedQuantity;

    await tx.stock.update({
      where: {
        id: stockLot.id,
      },
      data: {
        quantity: nextQuantity,
      },
    });

    await tx.stockMovement.create({
      data: {
        type: StockMovementType.OUT,
        quantity: deductedQuantity,
        previousQuantity: stockLot.quantity,
        newQuantity: nextQuantity,
        reason: "Venda checkout",
        notes: `Baixa automatica do carrinho ${cart.id}.`,
        expirationDate: stockLot.expirationDate,
        productId,
        stockId: stockLot.id,
      },
    });

    remainingQuantity -= deductedQuantity;
  }

  if (remainingQuantity > 0) {
    throw new Error(`Lotes insuficientes para ${productName}.`);
  }

  const aggregate = await tx.stock.aggregate({
    where: {
      productId,
    },
    _sum: {
      quantity: true,
    },
  });

  await tx.product.update({
    where: {
      id: productId,
    },
    data: {
      stock: aggregate._sum.quantity ?? 0,
    },
  });
}

async function deductCartStock(tx: FulfillmentTx, cart: CheckoutCart) {
  for (const item of cart.items) {
    if (!item.product.active) {
      throw new Error(`${item.product.name} nao esta disponivel para venda.`);
    }

    await deductProductStock({
      tx,
      cart,
      productId: item.productId,
      productName: item.product.name,
      productStockBeforeSale: item.product.stock,
      quantity: item.quantity,
    });
  }
}

export async function fulfillPaidCart(payload: CheckoutPaymentPayload) {
  let fulfilledCartId: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    const cart = await findCheckoutCartForFulfillment(tx, payload);

    if (!cart) {
      return { fulfilled: false, reason: "cart-not-found" as const };
    }

    if (!payload.userId || !cart.userId || cart.userId !== payload.userId) {
      return { fulfilled: false, reason: "user-mismatch" as const };
    }

    const paidAt = cart.paidAt ?? new Date();
    let stockDeductedAt = cart.stockDeductedAt;

    if (!stockDeductedAt) {
      const claimedAt = new Date();
      const claim = await tx.cart.updateMany({
        where: {
          id: cart.id,
          stockDeductedAt: null,
        },
        data: {
          stockDeductedAt: claimedAt,
        },
      });

      if (claim.count === 1) {
        await deductCartStock(tx, cart);
        stockDeductedAt = claimedAt;
      } else {
        const latestCart = await tx.cart.findFirst({
          where: {
            id: cart.id,
          },
          select: {
            stockDeductedAt: true,
          },
        });

        stockDeductedAt = latestCart?.stockDeductedAt ?? claimedAt;
      }
    }

    await tx.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        status: CartStatus.AWAITING_SHIPMENT,
        paymentStatus: PaymentStatus.PAID,
        stripeCheckoutSessionId: payload.stripeCheckoutSessionId ?? null,
        stripePaymentIntentId: payload.stripePaymentIntentId ?? null,
        mercadoPagoPaymentId: payload.mercadoPagoPaymentId ?? null,
        paidAt,
        stockDeductedAt,
      },
    });

    fulfilledCartId = cart.id;
    return { fulfilled: true, reason: "paid" as const };
  }, FULFILLMENT_TRANSACTION_OPTIONS);

  if (result.fulfilled && fulfilledCartId) {
    await ensureMelhorEnvioShipmentForPaidCart(fulfilledCartId);

    await recordAuditLog({
      action: "checkout.fulfill_paid_cart",
      entity: "Cart",
      entityId: fulfilledCartId,
      metadata: {
        stripeCheckoutSessionId: payload.stripeCheckoutSessionId ?? null,
        mercadoPagoPaymentId: payload.mercadoPagoPaymentId ?? null,
        hasPaymentIntent: Boolean(payload.stripePaymentIntentId),
      },
    });
  }

  revalidateCatalogCache();
  revalidatePath("/", "layout");

  return result;
}
