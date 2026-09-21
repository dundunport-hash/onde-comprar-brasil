import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Store,
} from "lucide-react";
import type Stripe from "stripe";
import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";
import { prisma } from "@/lib/prisma";
import { sanitizeExternalId, sanitizeText } from "@/lib/sanitize";
import { isPickupShippingMethod } from "@/lib/shipping";
import {
  getStoreAddressLines,
  SITE_NAME,
  STORE_CONTACT,
} from "@/lib/store-contact";
import { stripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: `Pedido confirmado | ${SITE_NAME}`,
  description: "Confirmacao do pagamento do pedido.",
};

type SuccessSearchParams = {
  session_id?: string | string[];
  mp_payment_id?: string | string[];
  processed?: string | string[];
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null,
) {
  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent?.id ?? null;
}

function getStatusLabel(paymentStatus: string) {
  if (paymentStatus === "paid") {
    return "Pagamento aprovado";
  }

  if (paymentStatus === "unpaid") {
    return "Pagamento em analise";
  }

  if (paymentStatus === "no_payment_required") {
    return "Pagamento dispensado";
  }

  return paymentStatus || "Status indisponivel";
}

function formatGenericDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isStorePickupCart(
  cart: Awaited<ReturnType<typeof getPaidCart>> | null,
) {
  return (
    isPickupShippingMethod(cart?.shippingMethod) ||
    cart?.shippingLabel?.toLowerCase().includes("retirada") === true
  );
}

function hasCompleteShippingAddress(
  cart: Awaited<ReturnType<typeof getPaidCart>> | null,
) {
  return Boolean(cart?.checkoutAddress?.document);
}

function getCartPaidTotal(cart: Awaited<ReturnType<typeof getPaidCart>>) {
  if (!cart) {
    return null;
  }

  const itemsTotal = cart.items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

  return itemsTotal + (cart.shippingPrice ?? 0);
}

async function getPaidCart({
  cartId,
  stripeCheckoutSessionId,
  mercadoPagoPaymentId,
}: {
  cartId?: string | null;
  stripeCheckoutSessionId?: string;
  mercadoPagoPaymentId?: string;
}) {
  return prisma.cart.findFirst({
    where: cartId
      ? {
          OR: [
            { id: cartId },
            ...(stripeCheckoutSessionId ? [{ stripeCheckoutSessionId }] : []),
            ...(mercadoPagoPaymentId ? [{ mercadoPagoPaymentId }] : []),
          ],
        }
      : stripeCheckoutSessionId
        ? {
            stripeCheckoutSessionId,
          }
        : {
            mercadoPagoPaymentId,
          },
    include: {
      checkoutAddress: true,
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

async function fulfillPaidCartFromSuccessPage(payload: {
  cartId?: string | null;
  userId?: string | null;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
}) {
  try {
    await fulfillPaidCart(payload);
    return true;
  } catch (error) {
    console.error("Nao foi possivel processar a baixa do pedido.", error);
    return false;
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SuccessSearchParams>;
}) {
  const query = await searchParams;
  const stripeSessionId = sanitizeExternalId(getSingleParam(query.session_id));
  const mercadoPagoPaymentId = sanitizeExternalId(
    getSingleParam(query.mp_payment_id),
  );
  const hasProcessedRedirect =
    sanitizeText(getSingleParam(query.processed), { maxLength: 10 }) === "1";

  if (!stripeSessionId && !mercadoPagoPaymentId) {
    return (
      <EmptyState
        title="Compra nao localizada"
        description="Nao recebemos o identificador da sessao de pagamento."
      />
    );
  }

  if (mercadoPagoPaymentId) {
    const cart = await getPaidCart({
      mercadoPagoPaymentId,
    });
    let payment;

    try {
      payment = await syncMercadoPagoPixPayment(mercadoPagoPaymentId);
    } catch {
      if (hasProcessedRedirect && cart?.paymentStatus === "PAID") {
        const isPickup = isStorePickupCart(cart);

        return (
          <SuccessContent
            cart={cart}
            amountTotal={getCartPaidTotal(cart)}
            paymentStatusLabel="Pagamento aprovado"
            processedAt={cart.paidAt ?? cart.updatedAt}
            paymentProvider="Mercado Pago Pix"
            paymentReference={mercadoPagoPaymentId}
            isPickup={isPickup}
            addressHref={`/checkout/endereco?mp_payment_id=${mercadoPagoPaymentId}`}
            primaryHref="/"
            primaryLabel="Voltar para home"
          />
        );
      }

      return (
        <EmptyState
          title="Compra nao localizada"
          description="Nao foi possivel consultar este pagamento no Mercado Pago."
        />
      );
    }

    const syncedCart = payment.externalReference
      ? await getPaidCart({
          cartId: payment.externalReference,
          mercadoPagoPaymentId: payment.id,
        })
      : cart;
    const isPickup = isStorePickupCart(syncedCart);

    if (
      payment.status === "approved" &&
      syncedCart &&
      !isPickup &&
      !hasCompleteShippingAddress(syncedCart)
    ) {
      redirect(`/checkout/endereco?mp_payment_id=${payment.id}`);
    }

    return (
      <SuccessContent
        cart={syncedCart}
        amountTotal={payment.transactionAmount}
        paymentStatusLabel={
          payment.status === "approved"
            ? "Pagamento aprovado"
            : payment.status === "pending"
              ? "Pagamento pendente"
              : payment.status
        }
        processedAt={payment.approvedAt ?? payment.createdAt}
        paymentProvider="Mercado Pago Pix"
        paymentReference={payment.id}
        isPickup={isPickup}
        addressHref={`/checkout/endereco?mp_payment_id=${payment.id}`}
        primaryHref={
          isPickup || hasCompleteShippingAddress(syncedCart)
            ? "/"
            : `/checkout/endereco?mp_payment_id=${payment.id}`
        }
        primaryLabel={
          isPickup || hasCompleteShippingAddress(syncedCart)
            ? "Voltar para home"
            : "Preencher endereco"
        }
      />
    );
  }

  let stripeSession: Stripe.Checkout.Session | null = null;

  try {
    stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
  } catch {
    return (
      <EmptyState
        title="Compra nao localizada"
        description="Nao foi possivel consultar esta sessao de pagamento na operadora de cartão."
      />
    );
  }

  const cartWasFulfilled =
    stripeSession.payment_status === "paid"
      ? await fulfillPaidCartFromSuccessPage({
          cartId: stripeSession.metadata?.cartId,
          userId: stripeSession.metadata?.userId,
          stripeCheckoutSessionId: stripeSession.id,
          stripePaymentIntentId: getPaymentIntentId(
            stripeSession.payment_intent,
          ),
        })
      : false;

  const cart = await getPaidCart({
    cartId: stripeSession.metadata?.cartId,
    stripeCheckoutSessionId: stripeSession.id,
  });
  const amountTotal =
    typeof stripeSession.amount_total === "number"
      ? stripeSession.amount_total / 100
      : null;
  const paymentStatusLabel = getStatusLabel(stripeSession.payment_status);
  const isPickup = isStorePickupCart(cart);

  if (
    stripeSession.payment_status === "paid" &&
    cart &&
    !isPickup &&
    !hasCompleteShippingAddress(cart)
  ) {
    redirect(`/checkout/endereco?session_id=${stripeSession.id}`);
  }

  if (
    stripeSession.payment_status === "paid" &&
    cartWasFulfilled &&
    !hasProcessedRedirect
  ) {
    redirect(`/checkout/sucesso?session_id=${stripeSession.id}&processed=1`);
  }

  return (
    <SuccessContent
      cart={cart}
      amountTotal={amountTotal}
      paymentStatusLabel={paymentStatusLabel}
      processedAt={
        stripeSession.created ? new Date(stripeSession.created * 1000) : null
      }
      paymentProvider="Stripe"
      paymentReference={stripeSession.id}
      isPickup={isPickup}
      addressHref={`/checkout/endereco?session_id=${stripeSession.id}`}
      primaryHref={
        isPickup || hasCompleteShippingAddress(cart)
          ? "/"
          : `/checkout/endereco?session_id=${stripeSession.id}`
      }
      primaryLabel={
        isPickup || hasCompleteShippingAddress(cart)
          ? "Voltar para home"
          : "Preencher endereco"
      }
    />
  );
}

function SuccessContent({
  cart,
  amountTotal,
  paymentStatusLabel,
  processedAt,
  paymentProvider,
  paymentReference,
  isPickup,
  addressHref,
  primaryHref,
  primaryLabel,
}: {
  cart: Awaited<ReturnType<typeof getPaidCart>>;
  amountTotal: number | null;
  paymentStatusLabel: string;
  processedAt: Date | string | null;
  paymentProvider: string;
  paymentReference: string;
  isPickup: boolean;
  addressHref: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6">
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-green-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em]">
                    Checkout
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                    Pedido confirmado
                  </h1>
                </div>
              </div>
              <span className="rounded-lg bg-background px-4 py-2 text-sm font-semibold text-green-700">
                {paymentStatusLabel}
              </span>
            </div>
            <p className="mt-4 text-sm">
              {isPickup
                ? "Recebemos sua compra. Separe o comprovante e retire o pedido no endereco da loja."
                : hasCompleteShippingAddress(cart)
                  ? "Recebemos sua compra. Seu pedido esta sendo processado para entrega no endereco informado."
                  : "Recebemos seu pagamento. Informe o endereco e CPF para prepararmos a entrega e a nota fiscal."}
            </p>
          </div>

          <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageCheck
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">Itens do pedido</h2>
            </div>

            {cart?.items.length ? (
              <div className="mt-5 divide-y divide-border">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted">
                        {item.quantity} unidade{item.quantity === 1 ? "" : "s"}{" "}
                        x {currencyFormatter.format(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-semibold text-primary">
                      {currencyFormatter.format(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Os itens deste pedido ainda nao estao disponiveis para exibicao.
              </p>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InfoPanel
              icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
              title={isPickup ? "Retirada na loja" : "Entrega"}
            >
              {isPickup ? (
                <div className="grid gap-3 text-sm text-muted">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-2">
                      <Store
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {STORE_CONTACT.name}
                        </p>
                        {getStoreAddressLines().map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                        <p>Telefone {STORE_CONTACT.phone}</p>
                      </div>
                    </div>
                  </div>
                  <a
                    href={STORE_CONTACT.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 font-semibold text-white transition hover:bg-[#1ebe5d]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Fale conosco
                  </a>
                </div>
              ) : cart?.checkoutAddress ? (
                <div className="grid gap-1 text-sm text-muted">
                  <p className="font-medium text-foreground">
                    {cart.checkoutAddress.fullName}
                  </p>
                  <p>CPF {cart.checkoutAddress.document}</p>
                  <p>
                    {cart.checkoutAddress.street}, {cart.checkoutAddress.number}
                  </p>
                  <p>
                    {cart.checkoutAddress.neighborhood} -{" "}
                    {cart.checkoutAddress.city}/{cart.checkoutAddress.state}
                  </p>
                  <p>CEP {cart.checkoutAddress.postalCode}</p>
                  {cart.shipmentTrackingCode && (
                    <p>Rastreio Melhor Envio: {cart.shipmentTrackingCode}</p>
                  )}
                  {!cart.shipmentTrackingCode &&
                    cart.shipmentStatus === "failed" && (
                      <p>Etiqueta Melhor Envio em revisao.</p>
                    )}
                </div>
              ) : (
                <div className="grid gap-3 text-sm text-muted">
                  <p>Endereco ainda nao informado para este pedido.</p>
                  <Link
                    href={addressHref}
                    className="inline-flex w-fit rounded-lg bg-primary px-4 py-2 font-semibold text-background transition hover:bg-primary/90"
                  >
                    Preencher endereco
                  </Link>
                </div>
              )}
            </InfoPanel>

            <InfoPanel
              icon={<CreditCard className="h-5 w-5" aria-hidden="true" />}
              title="Pagamento"
            >
              <div className="grid gap-1 text-sm text-muted">
                <p>Status: {paymentStatusLabel}</p>
                <p>Processado em {formatGenericDate(processedAt)}</p>
                <p>
                  {paymentProvider}: {paymentReference}
                </p>
              </div>
            </InfoPanel>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Resumo</h2>
          </div>

          <div className="mt-5 grid gap-3 text-sm">
            <SummaryLine label="Pedido" value={cart?.id.slice(0, 8) ?? "-"} />
            <SummaryLine
              label="Itens"
              value={String(
                cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
              )}
            />
            <SummaryLine
              label="Frete"
              value={
                cart?.shippingPrice != null
                  ? isPickup
                    ? "Retirada na loja"
                    : currencyFormatter.format(cart.shippingPrice)
                  : "Incluido no total"
              }
            />
            <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total pago</span>
              <span className="text-primary">
                {amountTotal !== null
                  ? currencyFormatter.format(amountTotal)
                  : "Indisponivel"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              {isPickup || hasCompleteShippingAddress(cart) ? (
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MapPin className="h-4 w-4" aria-hidden="true" />
              )}
              {primaryLabel}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar a loja
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted">
      <span>{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-primary">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
      <ReceiptText className="h-10 w-10 text-primary" aria-hidden="true" />
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted">{description}</p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
      >
        Voltar para a loja
      </Link>
    </main>
  );
}
