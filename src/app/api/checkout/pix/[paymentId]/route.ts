import { NextResponse } from "next/server";
import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";
import { prisma } from "@/lib/prisma";
import { sanitizeExternalId } from "@/lib/sanitize";

type PixPaymentStatusParams = {
  paymentId: string;
};

function getStatusLabel(status: string) {
  if (status === "approved") {
    return "Pagamento aprovado";
  }

  if (status === "pending") {
    return "Aguardando Pix";
  }

  if (status === "in_process") {
    return "Pagamento em analise";
  }

  if (status === "rejected") {
    return "Pagamento recusado";
  }

  if (status === "cancelled") {
    return "Pagamento cancelado";
  }

  return status || "Status indisponivel";
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<PixPaymentStatusParams>;
  },
) {
  const { paymentId: rawPaymentId } = await params;
  const paymentId = sanitizeExternalId(rawPaymentId);

  if (!paymentId) {
    return NextResponse.json(
      { error: "Pagamento nao informado." },
      { status: 400 },
    );
  }

  try {
    const payment = await syncMercadoPagoPixPayment(paymentId);
    const isApproved = payment.status === "approved";
    const cart = await prisma.cart.findFirst({
      where: {
        mercadoPagoPaymentId: payment.id,
      },
      select: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
    const cartWasEmptied = !cart || cart._count.items === 0;

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      statusLabel: getStatusLabel(payment.status),
      approved: isApproved,
      redirectUrl: isApproved
        ? `/checkout/sucesso?mp_payment_id=${payment.id}&processed=1`
        : cartWasEmptied
          ? "/"
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel consultar o pagamento.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
