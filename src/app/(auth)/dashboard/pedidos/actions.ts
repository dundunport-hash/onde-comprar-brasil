"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CartStatus, PaymentStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { ensureMelhorEnvioShipmentForPaidCart } from "@/lib/checkout-fulfillment";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";

const ORDERS_PATH = "/dashboard/pedidos";
const cartStatusValues = [
  "ACTIVE",
  "CHECKED_OUT",
  "AWAITING_SHIPMENT",
  "SEPARATED_SHIPPED",
  "DELIVERED",
  "AWAITING_PICKUP",
  "ABANDONED",
  "EXPIRED",
] satisfies CartStatus[];

function getString(formData: FormData, key: string) {
  return sanitizeText(formData.get(key), { maxLength: 120 });
}

function parseCartStatus(value: string) {
  if (cartStatusValues.includes(value as CartStatus)) {
    return value as CartStatus;
  }

  throw new Error("Status do pedido invalido.");
}

function parsePaymentStatus(value: string) {
  if (Object.values(PaymentStatus).includes(value as PaymentStatus)) {
    return value as PaymentStatus;
  }

  throw new Error("Status de pagamento invalido.");
}

function getLabelFailureFeedback(message: string | null) {
  if (!message) {
    return "Nao foi possivel gerar a etiqueta do Melhor Envio. Tente novamente apos revisar a conta.";
  }

  if (message.includes("pagina HTML de bloqueio")) {
    return "O Melhor Envio bloqueou a requisicao antes de validar a etiqueta. Removi URLs locais do payload; tente gerar novamente. Se persistir, confira se o token e a API sao do mesmo ambiente e se o IP atual esta liberado.";
  }

  if (message.includes("HTTP 403")) {
    return "O Melhor Envio recusou a compra da etiqueta. Verifique o saldo da conta, a forma de pagamento e as permissoes operacionais antes de tentar novamente.";
  }

  return message;
}

function buildLabelFailureHref(orderId: string, message: string | null) {
  const params = new URLSearchParams({
    labelFeedback: "error",
    order: orderId.slice(0, 8).toUpperCase(),
    message: getLabelFailureFeedback(message).slice(0, 360),
  });

  return `${ORDERS_PATH}?${params.toString()}`;
}

export async function updateOrderStatus(formData: FormData) {
  const session = await requireAdminSession();

  const orderId = getString(formData, "orderId");
  const status = parseCartStatus(getString(formData, "status"));

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  const order = await prisma.cart
    .update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
      select: {
        id: true,
        status: true,
      },
    })
    .catch(() => null);

  if (!order) {
    throw new Error("Pedido nao encontrado.");
  }

  if (order) {
    await recordAuditLog({
      action: "order.status.update",
      entity: "Cart",
      entityId: order.id,
      actor: getAuditActor(session),
      metadata: {
        status: order.status,
      },
    });
  }

  revalidatePath(ORDERS_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/metricas");
}

export async function updatePaymentStatus(formData: FormData) {
  const session = await requireAdminSession();

  const orderId = getString(formData, "orderId");
  const paymentStatus = parsePaymentStatus(
    getString(formData, "paymentStatus"),
  );

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  const currentOrder = await prisma.cart.findUnique({
    where: {
      id: orderId,
    },
    select: {
      paidAt: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!currentOrder) {
    throw new Error("Pedido nao encontrado.");
  }

  const order = await prisma.cart.update({
    where: {
      id: orderId,
    },
    data: {
      paymentStatus,
      paidAt:
        paymentStatus === PaymentStatus.PAID
          ? (currentOrder.paidAt ?? new Date())
          : currentOrder.paidAt,
      status:
        paymentStatus === PaymentStatus.PAID &&
        currentOrder.status === CartStatus.ACTIVE
          ? CartStatus.CHECKED_OUT
          : currentOrder.status,
    },
  });

  if (order) {
    if (order.paymentStatus === PaymentStatus.PAID) {
      await ensureMelhorEnvioShipmentForPaidCart(order.id);
    }

    await recordAuditLog({
      action: "order.payment_status.update",
      entity: "Cart",
      entityId: order.id,
      actor: getAuditActor(session),
      metadata: {
        previousPaymentStatus: currentOrder.paymentStatus,
        nextPaymentStatus: order.paymentStatus,
        status: order.status,
        paidAt: order.paidAt?.toISOString() ?? null,
      },
    });
  }

  revalidatePath(ORDERS_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/metricas");
}

export async function generateMelhorEnvioShippingLabel(formData: FormData) {
  const session = await requireAdminSession();

  const orderId = getString(formData, "orderId");

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  const result = await ensureMelhorEnvioShipmentForPaidCart(orderId);

  await recordAuditLog({
    action: "order.melhor_envio_label.generate",
    entity: "Cart",
    entityId: orderId,
    actor: getAuditActor(session),
    metadata: {
      created: result.created,
      reason: result.reason,
      message: "message" in result ? result.message : null,
    },
  });

  revalidatePath(ORDERS_PATH);
  revalidatePath("/dashboard");

  if (result.reason === "cart-not-paid") {
    throw new Error("A etiqueta so pode ser gerada para pedidos pagos.");
  }

  if (result.reason === "pickup") {
    throw new Error("Pedidos de retirada na loja nao precisam de etiqueta.");
  }

  if (result.reason === "address-missing") {
    throw new Error("Informe o endereco do pedido antes de gerar a etiqueta.");
  }

  if (result.reason === "address-document-missing") {
    throw new Error("Informe o CPF do destinatario antes de gerar a etiqueta.");
  }

  if (result.reason === "shipping-missing") {
    throw new Error("Calcule o frete do pedido antes de gerar a etiqueta.");
  }

  if (result.reason === "failed") {
    redirect(
      buildLabelFailureHref(
        orderId,
        "message" in result ? result.message : null,
      ),
    );
  }
}

export async function deleteOrder(formData: FormData) {
  const session = await requireAdminSession();

  const orderId = getString(formData, "orderId");

  if (!orderId) {
    throw new Error("Pedido invalido.");
  }

  const currentOrder = await prisma.cart.findUnique({
    where: {
      id: orderId,
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      userId: true,
      stripeCheckoutSessionId: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!currentOrder) {
    throw new Error("Pedido nao encontrado.");
  }

  if (currentOrder.paymentStatus === PaymentStatus.PAID) {
    throw new Error("Pedidos pagos nao podem ser excluidos.");
  }

  await prisma.cart.delete({
    where: {
      id: orderId,
    },
  });

  await recordAuditLog({
    action: "order.delete",
    entity: "Cart",
    entityId: currentOrder.id,
    actor: getAuditActor(session),
    metadata: {
      status: currentOrder.status,
      paymentStatus: currentOrder.paymentStatus,
      userId: currentOrder.userId,
      stripeCheckoutSessionId: currentOrder.stripeCheckoutSessionId,
      itemCount: currentOrder._count.items,
    },
  });

  revalidatePath(ORDERS_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/metricas");
}
