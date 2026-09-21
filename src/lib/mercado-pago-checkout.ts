import { PaymentStatus } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";
import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import {
  getMercadoPagoPayment,
  type MercadoPagoPayment,
} from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";

function toCartPaymentStatus(status: string) {
  if (status === "approved") {
    return PaymentStatus.PAID;
  }

  if (status === "cancelled" || status === "refunded") {
    return PaymentStatus.CANCELED;
  }

  if (status === "rejected") {
    return PaymentStatus.FAILED;
  }

  return PaymentStatus.PENDING;
}

function getCartId(payment: MercadoPagoPayment) {
  return payment.metadata.cartId ?? payment.externalReference;
}

export async function syncMercadoPagoPixPayment(paymentId: string) {
  const payment = await getMercadoPagoPayment(paymentId);
  const cartId = getCartId(payment);
  const userId = payment.metadata.userId;
  const paymentStatus = toCartPaymentStatus(payment.status);

  await prisma.cart.updateMany({
    where: cartId
      ? {
          OR: [{ id: cartId }, { mercadoPagoPaymentId: payment.id }],
        }
      : {
          mercadoPagoPaymentId: payment.id,
        },
    data: {
      mercadoPagoPaymentId: payment.id,
      mercadoPagoStatus: payment.status,
      mercadoPagoStatusDetail: payment.statusDetail,
      pixQrCode: payment.pix.qrCode,
      pixQrCodeBase64: payment.pix.qrCodeBase64,
      pixTicketUrl: payment.pix.ticketUrl,
      paymentStatus,
    },
  });

  if (paymentStatus === PaymentStatus.PAID) {
    await fulfillPaidCart({
      cartId,
      userId,
      mercadoPagoPaymentId: payment.id,
    });
  }

  await recordAuditLog({
    action: "mercadopago.pix.sync",
    entity: "Cart",
    entityId: cartId ?? null,
    metadata: {
      mercadoPagoPaymentId: payment.id,
      mercadoPagoStatus: payment.status,
      mercadoPagoStatusDetail: payment.statusDetail,
      paymentStatus,
    },
  });

  return payment;
}
