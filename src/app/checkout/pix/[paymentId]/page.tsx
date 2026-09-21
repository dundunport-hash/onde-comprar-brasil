import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, Copy, CreditCard, QrCode } from "lucide-react";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { isMercadoPagoTestMode } from "@/lib/mercado-pago";
import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";
import { prisma } from "@/lib/prisma";
import { sanitizeExternalId } from "@/lib/sanitize";
import { SITE_NAME } from "@/lib/store-contact";
import {
  CheckoutHeader,
  CheckoutItems,
} from "@/components/CheckoutPresentation";
import { CopyPixPaymentLinkButton } from "./CopyPixPaymentLinkButton";
import { PixPaymentAutoRefresh } from "./PixPaymentAutoRefresh";

export const metadata: Metadata = {
  title: `Pix | Checkout ${SITE_NAME}`,
  description: "Pague seu pedido com Pix.",
};

type PixPaymentPageParams = {
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

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function PixPaymentPage({
  params,
}: {
  params: Promise<PixPaymentPageParams>;
}) {
  const { paymentId: rawPaymentId } = await params;
  const paymentId = sanitizeExternalId(rawPaymentId);

  if (!paymentId) {
    redirect("/checkout/pagamento");
  }

  const payment = await syncMercadoPagoPixPayment(paymentId);

  if (payment.status === "approved") {
    redirect(`/checkout/sucesso?mp_payment_id=${payment.id}&processed=1`);
  }

  const cart = await prisma.cart.findFirst({
    where: {
      mercadoPagoPaymentId: payment.id,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    redirect("/");
  }

  const qrCodeImage = payment.pix.qrCodeBase64
    ? `data:image/png;base64,${payment.pix.qrCodeBase64}`
    : null;
  const isTestMode = isMercadoPagoTestMode();

  return (
    <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <PixPaymentAutoRefresh paymentId={payment.id} />
      <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <CheckoutHeader
          title="Pague com Pix"
          description="Use o QR Code ou o código copia e cola no aplicativo do seu banco. Confira o valor antes de confirmar."
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-background p-4">
            {qrCodeImage ? (
              <Image
                src={qrCodeImage}
                alt="QR Code Pix"
                width={224}
                height={224}
                unoptimized
                className="h-56 w-56 object-contain"
              />
            ) : (
              <QrCode className="h-20 w-20 text-muted" aria-hidden="true" />
            )}
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              <div className="flex items-center gap-2 font-semibold">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {getStatusLabel(payment.status)}
              </div>
              <p className="mt-2">
                {isTestMode
                  ? "Este Pix foi gerado com credenciais TEST do Mercado Pago. Ele valida a integracao, mas pode ser recusado como codigo invalido em apps bancarios reais."
                  : "Abra o app do seu banco, escaneie o QR Code ou use o codigo copia-e-cola. A confirmacao pode levar alguns instantes."}
              </p>
            </div>

            {isTestMode && (
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted">
                Para testar pagamento real por Pix, use credenciais de producao
                de uma conta habilitada com chave Pix no Mercado Pago. Com
                credenciais TEST, use o fluxo para validar criacao do QR,
                exibicao e consulta de status.
              </div>
            )}

            {payment.pix.qrCode && (
              <div className="grid gap-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="pix-code"
                >
                  Pix copia-e-cola
                </label>
                <textarea
                  id="pix-code"
                  readOnly
                  className="min-h-32 resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground"
                  value={payment.pix.qrCode}
                />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {payment.pix.ticketUrl && (
                <>
                  <CopyPixPaymentLinkButton
                    paymentUrl={payment.pix.ticketUrl}
                  />
                  <Link
                    href={payment.pix.ticketUrl}
                    target="_blank"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Abrir no Mercado Pago
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Resumo</h2>
        </div>

        <div className="mt-5 grid gap-3 text-sm">
          <SummaryLine label="Pagamento" value={payment.id} />
          <SummaryLine label="Status" value={getStatusLabel(payment.status)} />
          <SummaryLine
            label="Criado em"
            value={formatDate(payment.createdAt)}
          />
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">
              {payment.transactionAmount !== null
                ? currencyFormatter.format(payment.transactionAmount)
                : "Indisponivel"}
            </span>
          </div>
        </div>

        <CheckoutItems items={cart.items} />

        {payment.status === "approved" && (
          <Link
            href={`/checkout/sucesso?mp_payment_id=${payment.id}&processed=1`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Ver pedido
          </Link>
        )}
      </aside>
    </main>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-muted">
      <span>{label}</span>
      <span className="break-all text-right text-foreground">{value}</span>
    </div>
  );
}
