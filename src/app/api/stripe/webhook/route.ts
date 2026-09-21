import { PaymentStatus } from "@prisma/client";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { env } from "@/lib/env";
import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "stripe-webhook",
    method: "POST",
  });
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function getEventObjectId(event: Stripe.Event) {
  const eventObject = event.data.object as { id?: unknown };

  return typeof eventObject.id === "string" ? eventObject.id : null;
}

async function reserveStripeWebhookEvent(event: Stripe.Event) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        objectId: getEventObjectId(event),
      },
    });

    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }

    throw error;
  }
}

async function markStripeWebhookEventProcessed(event: Stripe.Event) {
  await prisma.stripeWebhookEvent.update({
    where: {
      id: event.id,
    },
    data: {
      processedAt: new Date(),
    },
  });
}

async function releaseStripeWebhookEvent(event: Stripe.Event) {
  await prisma.stripeWebhookEvent.delete({
    where: {
      id: event.id,
    },
  });
}

function getPaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null,
) {
  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent?.id ?? null;
}

async function markCheckoutSessionPaid(
  checkoutSession: Stripe.Checkout.Session,
) {
  await fulfillPaidCart({
    cartId: checkoutSession.metadata?.cartId,
    userId: checkoutSession.metadata?.userId,
    stripeCheckoutSessionId: checkoutSession.id,
    stripePaymentIntentId: getPaymentIntentId(checkoutSession.payment_intent),
  });
}

async function markCheckoutSessionFailed(
  checkoutSession: Stripe.Checkout.Session,
) {
  const result = await prisma.cart.updateMany({
    where: {
      stripeCheckoutSessionId: checkoutSession.id,
      paymentStatus: PaymentStatus.PENDING,
    },
    data: {
      paymentStatus: PaymentStatus.FAILED,
    },
  });

  if ((result?.count ?? 0) > 0) {
    await recordAuditLog({
      action: "stripe.checkout.failed",
      entity: "Cart",
      entityId: checkoutSession.metadata?.cartId ?? null,
      metadata: {
        stripeCheckoutSessionId: checkoutSession.id,
        updatedCarts: result.count,
      },
    });
  }
}

async function markCheckoutSessionCanceled(
  checkoutSession: Stripe.Checkout.Session,
) {
  const result = await prisma.cart.updateMany({
    where: {
      stripeCheckoutSessionId: checkoutSession.id,
      paymentStatus: PaymentStatus.PENDING,
    },
    data: {
      paymentStatus: PaymentStatus.CANCELED,
    },
  });

  if ((result?.count ?? 0) > 0) {
    await recordAuditLog({
      action: "stripe.checkout.canceled",
      entity: "Cart",
      entityId: checkoutSession.metadata?.cartId ?? null,
      metadata: {
        stripeCheckoutSessionId: checkoutSession.id,
        updatedCarts: result.count,
      },
    });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Assinatura Stripe ausente." },
      { status: 400 },
    );
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook Stripe nao configurado." },
      { status: 500 },
    );
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Assinatura invalida.";

    return NextResponse.json(
      { error: `Webhook Stripe invalido: ${message}` },
      { status: 400 },
    );
  }

  const isNewEvent = await reserveStripeWebhookEvent(event);

  if (!isNewEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;

      if (checkoutSession.payment_status === "paid") {
        await markCheckoutSessionPaid(checkoutSession);
      }
    }

    if (event.type === "checkout.session.async_payment_failed") {
      await markCheckoutSessionFailed(
        event.data.object as Stripe.Checkout.Session,
      );
    }

    if (event.type === "checkout.session.expired") {
      await markCheckoutSessionCanceled(
        event.data.object as Stripe.Checkout.Session,
      );
    }

    await markStripeWebhookEventProcessed(event);
  } catch (error) {
    await releaseStripeWebhookEvent(event);
    throw error;
  }

  return NextResponse.json({ received: true });
}
