"use server";

import { redirect } from "next/navigation";
import { sanitizeExternalId } from "@/lib/sanitize";
import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";

export async function refreshPixPaymentStatus(formData: FormData) {
  const paymentId = sanitizeExternalId(formData.get("paymentId"));

  if (!paymentId) {
    redirect("/checkout/pagamento");
  }

  const payment = await syncMercadoPagoPixPayment(paymentId);

  if (payment.status === "approved") {
    redirect(`/checkout/sucesso?mp_payment_id=${payment.id}&processed=1`);
  }

  redirect(`/checkout/pix/${payment.id}`);
}
