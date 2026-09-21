import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { CreditCard, QrCode, ShoppingBag } from "lucide-react";
import {
  CheckoutHeader,
  CheckoutItems,
} from "@/components/CheckoutPresentation";
import { authOptions } from "@/lib/auth";
import {
  cartHasControlledMedication,
  getCart,
  getCartSummary,
} from "@/lib/cart";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { isPickupShippingMethod } from "@/lib/shipping";
import { SITE_NAME } from "@/lib/store-contact";
import { validateCartStock } from "@/lib/stock-validation";
import {
  createMercadoPagoPixPayment,
  createStripeCheckoutSession,
} from "./actions";

export const metadata: Metadata = {
  title: `Pagamento | Checkout ${SITE_NAME}`,
  description: "Finalize sua compra com Pix ou Cartão.",
};

type CheckoutPaymentSearchParams = {
  payment_error?: string | string[];
};

export default async function CheckoutPaymentPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutPaymentSearchParams>;
}) {
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  const cart = await getCart(session?.user?.id ?? null);
  const paymentError =
    typeof query.payment_error === "string" ? query.payment_error : null;

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Seu carrinho esta vazio"
        description="Adicione produtos antes de iniciar o pagamento."
        href="/"
        action="Ver produtos"
      />
    );
  }

  const summary = getCartSummary(cart);
  const stockValidation = validateCartStock(cart.items);
  const hasControlledMedication = cartHasControlledMedication(cart);
  const isPickup =
    hasControlledMedication || isPickupShippingMethod(cart.shippingMethod);
  const missingPrescription =
    hasControlledMedication && !cart.prescriptionImageUrl;
  const missingShipping =
    !isPickup &&
    (!cart.shippingLabel ||
      cart.shippingPrice == null ||
      cart.shippingPrice <= 0);
  const canPay = Boolean(
    session &&
    stockValidation.isValid &&
    !missingShipping &&
    !missingPrescription,
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <CheckoutHeader
          title="Como você quer pagar?"
          description="Confira os produtos e o total da compra. Escolha Pix ou cartão para continuar com o pagamento."
        />

        <div className="mt-6 grid gap-4">
          {paymentError === "mercadopago_unavailable" && (
            <div className="rounded-lg border border-warning bg-yellow-50 p-4 text-sm text-warning">
              <p className="font-semibold">
                Não foi possível gerar o QR Code do Pix no momento.
              </p>
              <p className="mt-1">
                Verifique as credenciais do Mercado Pago ou tente novamente em
                instantes.
              </p>
            </div>
          )}

          {!stockValidation.isValid && (
            <WarningCard
              title="Revise o estoque"
              href="/"
              action="Voltar a loja"
            />
          )}

          {missingShipping && (
            <WarningCard
              title="Calcule o frete antes do pagamento"
              href="/"
              action="Abrir carrinho no topo"
            />
          )}

          {missingPrescription && (
            <WarningCard
              title="Anexe a receita para medicamentos controlados"
              href="/"
              action="Abrir carrinho no topo"
            />
          )}

          {!session &&
            stockValidation.isValid &&
            !missingShipping &&
            !missingPrescription && (
              <Link
                href="/login?callbackUrl=/checkout/pagamento"
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
              >
                Fazer login para finalizar a compra
              </Link>
            )}

          {canPay && (
            <div className="grid gap-3 sm:grid-cols-2">
              <form action={createMercadoPagoPixPayment}>
                <button
                  type="submit"
                  className="flex min-h-24 w-full items-center justify-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
                >
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                  Pagar com Pix
                </button>
              </form>
              <form action={createStripeCheckoutSession}>
                <button
                  type="submit"
                  className="flex min-h-24 w-full items-center justify-center gap-3 rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
                >
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                  Pagar com Cartão
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <aside className="h-fit rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Resumo da compra</h2>
        <CheckoutItems items={cart.items} />
        <div className="mt-5 grid gap-3 text-sm">
          <div className="flex items-center justify-between text-muted">
            <span>Itens</span>
            <span>{summary.quantity}</span>
          </div>
          <div className="flex items-center justify-between text-muted">
            <span>Subtotal</span>
            <span>{currencyFormatter.format(summary.subtotal)}</span>
          </div>
          {summary.discountTotal > 0 && (
            <div className="flex items-center justify-between text-primary">
              <span>Descontos</span>
              <span>-{currencyFormatter.format(summary.discountTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-muted">
            <span>Frete</span>
            <span>
              {summary.shippingTotal > 0
                ? currencyFormatter.format(summary.shippingTotal)
                : isPickup
                  ? "Retirada na loja"
                  : cart.shippingLabel
                    ? "Recalcule o frete"
                    : "Nao calculado"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">
              {currencyFormatter.format(summary.total)}
            </span>
          </div>
        </div>
      </aside>
    </main>
  );
}

function WarningCard({
  title,
  href,
  action,
}: {
  title: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-danger bg-red-50 p-4 text-sm text-danger">
      <p className="font-semibold">{title}</p>
      <Link
        href={href}
        className="mt-3 inline-flex rounded-lg border border-danger px-4 py-2 font-medium transition hover:bg-danger hover:text-background"
      >
        {action}
      </Link>
    </div>
  );
}

function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
      <ShoppingBag className="h-10 w-10 text-primary" aria-hidden="true" />
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted">{description}</p>
      <Link
        href={href}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
      >
        {action}
      </Link>
    </main>
  );
}
