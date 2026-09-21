"use server";

import { CartStatus, PaymentStatus } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import {
  cartHasControlledMedication,
  getCart,
  getCartSummary,
} from "@/lib/cart";
import { validateCouponForProduct } from "@/lib/coupons";
import { prisma } from "@/lib/prisma";
import { createPixPayment, toMercadoPagoAmount } from "@/lib/mercado-pago";
import {
  assertRateLimit,
  createRateLimitKey,
  getClientIp,
} from "@/lib/rate-limit";
import { stripe, toStripeAmount } from "@/lib/stripe";
import { calculateProductPricing } from "@/lib/pricing";
import {
  PICKUP_SHIPPING_LABEL,
  PICKUP_SHIPPING_METHOD,
  isPickupShippingMethod,
} from "@/lib/shipping";
import { validateCartStock } from "@/lib/stock-validation";
import { SITE_NAME } from "@/lib/store-contact";

type StripeCheckoutSessionParams = NonNullable<
  Parameters<typeof stripe.checkout.sessions.create>[0]
>;
type StripeLineItem = NonNullable<
  StripeCheckoutSessionParams["line_items"]
>[number];

function getProductImage(product: {
  imageUrl: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
}) {
  return [product.imageUrl, product.imageUrl2, product.imageUrl3].find(
    (imageUrl): imageUrl is string =>
      typeof imageUrl === "string" && imageUrl.startsWith("http"),
  );
}

async function getBaseUrl() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  return origin ?? process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
}

function isPrivateHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function getMercadoPagoNotificationUrl(baseUrl: string) {
  try {
    const url = new URL("/api/mercado-pago/webhook", baseUrl);

    if (url.protocol !== "https:" || isPrivateHostname(url.hostname)) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function createStripeCheckoutIdempotencyKey(
  cartId: string,
  updatedAt: Date,
  total: number,
) {
  return `checkout-session:${cartId}:${updatedAt.getTime()}:${toStripeAmount(total)}`;
}

function createPixPaymentIdempotencyKey(
  cartId: string,
  updatedAt: Date,
  total: number,
) {
  return `pix-payment:${cartId}:${updatedAt.getTime()}:${toMercadoPagoAmount(total)}`;
}

async function getValidatedCheckoutCart(session: {
  user: {
    id?: string | null;
  };
}) {
  const cart = await getCart(session.user.id);

  if (!cart || cart.items.length === 0) {
    redirect("/");
  }

  for (const item of cart.items) {
    const basePricing = calculateProductPricing(
      item.product.price,
      item.product.promotions,
    );

    if (!item.couponCode) {
      if (item.unitPrice !== basePricing.finalPrice) {
        await prisma.cartItem.update({
          where: {
            id: item.id,
          },
          data: {
            baseUnitPrice: basePricing.finalPrice,
            unitPrice: basePricing.finalPrice,
            couponId: null,
            couponCode: null,
            couponDiscountPercent: null,
            couponDiscountAmount: 0,
            couponFinalUnitPrice: null,
          },
        });
        item.unitPrice = basePricing.finalPrice;
        item.baseUnitPrice = basePricing.finalPrice;
      }
      continue;
    }

    const validation = await validateCouponForProduct({
      codeValue: item.couponCode,
      productId: item.productId,
      unitPrice: basePricing.finalPrice,
    });

    if (validation.status !== "valid") {
      await prisma.cartItem.update({
        where: {
          id: item.id,
        },
        data: {
          baseUnitPrice: basePricing.finalPrice,
          unitPrice: basePricing.finalPrice,
          couponId: null,
          couponCode: null,
          couponDiscountPercent: null,
          couponDiscountAmount: 0,
          couponFinalUnitPrice: null,
        },
      });
      redirect("/");
    }

    await prisma.cartItem.update({
      where: {
        id: item.id,
      },
      data: {
        baseUnitPrice: basePricing.finalPrice,
        unitPrice: validation.finalUnitPrice,
        couponId: validation.coupon.id,
        couponCode: validation.coupon.code,
        couponDiscountPercent: validation.coupon.discountPercent,
        couponDiscountAmount: validation.discountAmount,
        couponFinalUnitPrice: validation.finalUnitPrice,
      },
    });
    item.baseUnitPrice = basePricing.finalPrice;
    item.unitPrice = validation.finalUnitPrice;
    item.couponId = validation.coupon.id;
    item.couponCode = validation.coupon.code;
    item.couponDiscountPercent = validation.coupon.discountPercent;
    item.couponDiscountAmount = validation.discountAmount;
    item.couponFinalUnitPrice = validation.finalUnitPrice;
  }

  const summary = getCartSummary(cart);
  const stockValidation = validateCartStock(cart.items);
  const hasControlledMedication = cartHasControlledMedication(cart);
  const isPickup =
    hasControlledMedication || isPickupShippingMethod(cart.shippingMethod);

  if (!stockValidation.isValid) {
    redirect("/");
  }

  if (hasControlledMedication && !cart.prescriptionImageUrl) {
    redirect("/");
  }

  if (hasControlledMedication && !isPickup) {
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
  }

  if (
    !isPickup &&
    (!cart.shippingLabel ||
      cart.shippingPrice == null ||
      cart.shippingPrice <= 0)
  ) {
    redirect("/");
  }

  return { cart, summary };
}

export async function createStripeCheckoutSession() {
  const session = await getServerSession(authOptions);
  const requestHeaders = await headers();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout/pagamento");
  }

  assertRateLimit({
    key: createRateLimitKey(
      "checkout:session",
      session.user.id ?? getClientIp(requestHeaders),
    ),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  const { cart, summary } = await getValidatedCheckoutCart(session);

  const baseUrl = await getBaseUrl();
  const lineItems: StripeLineItem[] = cart.items.map((item) => {
    const imageUrl = getProductImage(item.product);

    return {
      quantity: item.quantity,
      price_data: {
        currency: "brl",
        unit_amount: toStripeAmount(item.unitPrice),
        product_data: {
          name: item.product.name,
          images: imageUrl ? [imageUrl] : undefined,
        },
      },
    };
  });

  if (summary.shippingTotal > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "brl",
        unit_amount: toStripeAmount(summary.shippingTotal),
        product_data: {
          name: `Frete - ${cart.shippingLabel}`,
          images: undefined,
        },
      },
    });
  }

  const stripeSession = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "pt-BR",
      client_reference_id: cart.id,
      customer_email: session.user.email ?? undefined,
      line_items: lineItems,
      success_url: `${baseUrl}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancelado`,
      metadata: {
        cartId: cart.id,
        userId: session.user.id,
        postalCode: cart.shippingPostalCode ?? "",
        shippingMethod: cart.shippingMethod ?? "",
      },
    },
    {
      idempotencyKey: createStripeCheckoutIdempotencyKey(
        cart.id,
        cart.updatedAt,
        summary.total,
      ),
    },
  );

  await prisma.cart.update({
    where: {
      id: cart.id,
    },
    data: {
      stripeCheckoutSessionId: stripeSession.id,
      stripePaymentIntentId:
        typeof stripeSession.payment_intent === "string"
          ? stripeSession.payment_intent
          : null,
      paymentStatus: PaymentStatus.PENDING,
      status: CartStatus.ACTIVE,
    },
  });

  await recordAuditLog({
    action: "checkout.session.create",
    entity: "Cart",
    entityId: cart.id,
    actor: getAuditActor(session),
    metadata: {
      stripeCheckoutSessionId: stripeSession.id,
      total: summary.total,
      itemCount: summary.quantity,
      shippingMethod: cart.shippingMethod,
      shippingTotal: summary.shippingTotal,
    },
  });

  if (!stripeSession.url) {
    throw new Error("Nao foi possivel iniciar o pagamento.");
  }

  redirect(stripeSession.url);
}

export async function createMercadoPagoPixPayment() {
  const session = await getServerSession(authOptions);
  const requestHeaders = await headers();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout/pagamento");
  }

  assertRateLimit({
    key: createRateLimitKey(
      "checkout:pix",
      session.user.id ?? getClientIp(requestHeaders),
    ),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  const { cart, summary } = await getValidatedCheckoutCart(session);
  const baseUrl = await getBaseUrl();
  let redirectHref: string;

  try {
    const payment = await createPixPayment({
      cartId: cart.id,
      userId: session.user.id,
      payerEmail: session.user.email ?? "cliente@drogariamegapopular.com.br",
      amount: summary.total,
      description: `Pedido ${SITE_NAME} ${cart.id.slice(0, 8)}`,
      notificationUrl: getMercadoPagoNotificationUrl(baseUrl),
      idempotencyKey: createPixPaymentIdempotencyKey(
        cart.id,
        cart.updatedAt,
        summary.total,
      ),
    });

    await prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        mercadoPagoPaymentId: payment.id,
        mercadoPagoStatus: payment.status,
        mercadoPagoStatusDetail: payment.statusDetail,
        pixQrCode: payment.pix.qrCode,
        pixQrCodeBase64: payment.pix.qrCodeBase64,
        pixTicketUrl: payment.pix.ticketUrl,
        paymentStatus:
          payment.status === "approved"
            ? PaymentStatus.PAID
            : PaymentStatus.PENDING,
        status: CartStatus.ACTIVE,
      },
    });

    await recordAuditLog({
      action: "mercadopago.pix.create",
      entity: "Cart",
      entityId: cart.id,
      actor: getAuditActor(session),
      metadata: {
        mercadoPagoPaymentId: payment.id,
        mercadoPagoStatus: payment.status,
        total: summary.total,
        itemCount: summary.quantity,
        shippingMethod: cart.shippingMethod,
        shippingTotal: summary.shippingTotal,
      },
    });

    if (payment.status === "approved") {
      await fulfillPaidCart({
        cartId: cart.id,
        userId: session.user.id,
        mercadoPagoPaymentId: payment.id,
      });

      redirectHref = `/checkout/sucesso?mp_payment_id=${payment.id}&processed=1`;
    } else {
      redirectHref = `/checkout/pix/${payment.id}`;
    }
  } catch (error) {
    console.error("Falha ao criar pagamento Pix:", error);
    redirect("/checkout/pagamento?payment_error=mercadopago_unavailable");
  }

  redirect(redirectHref);
}
