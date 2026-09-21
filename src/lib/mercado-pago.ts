import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const MERCADO_PAGO_API_URL = "https://api.mercadopago.com";

type MercadoPagoApiError = {
  message?: string;
  error?: string;
  status?: number;
  cause?: unknown;
};

type MercadoPagoPaymentResponse = {
  id: number | string;
  status: string;
  status_detail?: string | null;
  external_reference?: string | null;
  metadata?: {
    cart_id?: string;
    user_id?: string;
    cartId?: string;
    userId?: string;
  } | null;
  transaction_amount?: number;
  date_created?: string;
  date_approved?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

export type MercadoPagoPayment = {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  metadata: {
    cartId?: string;
    userId?: string;
  };
  transactionAmount: number | null;
  createdAt: string | null;
  approvedAt: string | null;
  pix: {
    qrCode: string | null;
    qrCodeBase64: string | null;
    ticketUrl: string | null;
  };
};

export type CreatePixPaymentInput = {
  cartId: string;
  userId: string;
  payerEmail: string;
  amount: number;
  description: string;
  idempotencyKey: string;
  notificationUrl?: string;
};

function getAccessToken() {
  return env.MERCADO_PAGO_ACCESS_TOKEN ?? env.Access_Token_Mercado_Pago;
}

export function isMercadoPagoTestMode() {
  return getAccessToken()?.startsWith("TEST-") ?? false;
}

export function getMercadoPagoWebhookSecret() {
  return env.MERCADO_PAGO_WEBHOOK_SECRET ?? env.assinatura_secreta_Teste;
}

export function toMercadoPagoAmount(value: number) {
  return Math.max(Number(value.toFixed(2)), 0);
}

function normalizePayment(payment: MercadoPagoPaymentResponse) {
  const transactionData = payment.point_of_interaction?.transaction_data ?? {};

  return {
    id: String(payment.id),
    status: payment.status,
    statusDetail: payment.status_detail ?? null,
    externalReference: payment.external_reference ?? null,
    metadata: {
      cartId: payment.metadata?.cart_id ?? payment.metadata?.cartId,
      userId: payment.metadata?.user_id ?? payment.metadata?.userId,
    },
    transactionAmount:
      typeof payment.transaction_amount === "number"
        ? payment.transaction_amount
        : null,
    createdAt: payment.date_created ?? null,
    approvedAt: payment.date_approved ?? null,
    pix: {
      qrCode: transactionData.qr_code ?? null,
      qrCodeBase64: transactionData.qr_code_base64 ?? null,
      ticketUrl: transactionData.ticket_url ?? null,
    },
  } satisfies MercadoPagoPayment;
}

async function mercadoPagoRequest<T>({
  path,
  method = "GET",
  body,
  idempotencyKey,
}: {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
}) {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("Mercado Pago nao configurado.");
  }

  const response = await fetch(`${MERCADO_PAGO_API_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as
    | T
    | MercadoPagoApiError;

  if (!response.ok) {
    const error = payload as MercadoPagoApiError;
    throw new Error(
      error.message ??
        error.error ??
        "Nao foi possivel comunicar com o Mercado Pago.",
    );
  }

  return payload as T;
}

export async function createPixPayment(input: CreatePixPaymentInput) {
  const payment = await mercadoPagoRequest<MercadoPagoPaymentResponse>({
    path: "/v1/payments",
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      transaction_amount: toMercadoPagoAmount(input.amount),
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.cartId,
      notification_url: input.notificationUrl,
      metadata: {
        cart_id: input.cartId,
        user_id: input.userId,
      },
      payer: {
        email: input.payerEmail,
      },
    },
  });

  return normalizePayment(payment);
}

export async function getMercadoPagoPayment(paymentId: string) {
  const payment = await mercadoPagoRequest<MercadoPagoPaymentResponse>({
    path: `/v1/payments/${encodeURIComponent(paymentId)}`,
  });

  return normalizePayment(payment);
}

function getSignaturePart(signature: string, key: string) {
  return signature
    .split(",")
    .map((part) => part.trim().split("="))
    .find(([partKey]) => partKey === key)?.[1];
}

function buildManifest({
  dataId,
  requestId,
  timestamp,
}: {
  dataId?: string | null;
  requestId?: string | null;
  timestamp: string;
}) {
  return [
    dataId ? `id:${dataId};` : "",
    requestId ? `request-id:${requestId};` : "",
    `ts:${timestamp};`,
  ].join("");
}

export function isValidMercadoPagoWebhookSignature({
  signature,
  requestId,
  dataId,
  secret,
}: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}) {
  if (!signature) {
    return false;
  }

  const timestamp = getSignaturePart(signature, "ts");
  const receivedHash = getSignaturePart(signature, "v1");

  if (!timestamp || !receivedHash) {
    return false;
  }

  const manifest = buildManifest({ dataId, requestId, timestamp });
  const expectedHash = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
