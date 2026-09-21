import { NextResponse } from "next/server";
import {
  getMercadoPagoWebhookSecret,
  isValidMercadoPagoWebhookSignature,
} from "@/lib/mercado-pago";
import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MercadoPagoWebhookPayload = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "mercado-pago-webhook",
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

function getPaymentId(payload: MercadoPagoWebhookPayload, request: Request) {
  const url = new URL(request.url);
  const queryDataId = url.searchParams.get("data.id");
  const dataId = payload.data?.id ?? queryDataId;

  return dataId == null ? null : String(dataId);
}

async function reserveMercadoPagoWebhookEvent({
  id,
  type,
  action,
  objectId,
}: {
  id: string;
  type: string;
  action: string | null;
  objectId: string;
}) {
  try {
    await prisma.mercadoPagoWebhookEvent.create({
      data: {
        id,
        type,
        action,
        objectId,
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

async function markMercadoPagoWebhookEventProcessed(id: string) {
  await prisma.mercadoPagoWebhookEvent.update({
    where: {
      id,
    },
    data: {
      processedAt: new Date(),
    },
  });
}

async function releaseMercadoPagoWebhookEvent(id: string) {
  await prisma.mercadoPagoWebhookEvent.delete({
    where: {
      id,
    },
  });
}

export async function POST(request: Request) {
  const payload = (await request
    .json()
    .catch(() => null)) as MercadoPagoWebhookPayload | null;

  if (!payload) {
    return NextResponse.json(
      { error: "Payload Mercado Pago invalido." },
      { status: 400 },
    );
  }

  const paymentId = getPaymentId(payload, request);

  if (!paymentId) {
    return NextResponse.json(
      { error: "Pagamento Mercado Pago nao informado." },
      { status: 400 },
    );
  }

  const secret = getMercadoPagoWebhookSecret();

  if (secret) {
    const isValidSignature = isValidMercadoPagoWebhookSignature({
      secret,
      dataId: paymentId,
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Assinatura Mercado Pago invalida." },
        { status: 400 },
      );
    }
  }

  const type = payload.type ?? "payment";
  const action = payload.action ?? null;
  const eventId =
    payload.id == null
      ? `${type}:${action ?? "unknown"}:${paymentId}`
      : String(payload.id);
  const isNewEvent = await reserveMercadoPagoWebhookEvent({
    id: eventId,
    type,
    action,
    objectId: paymentId,
  });

  if (!isNewEvent) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await syncMercadoPagoPixPayment(paymentId);
    await markMercadoPagoWebhookEventProcessed(eventId);
  } catch (error) {
    await releaseMercadoPagoWebhookEvent(eventId);
    throw error;
  }

  return NextResponse.json({ received: true });
}
