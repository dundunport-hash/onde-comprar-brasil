import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import {
  CheckoutHeader,
  CheckoutItems,
} from "@/components/CheckoutPresentation";
import { authOptions } from "@/lib/auth";
import {
  emptyCheckoutAddressValues,
  type CheckoutAddressValues,
} from "@/lib/address";
import { cartInclude, getCart, getCartSummary } from "@/lib/cart";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { prisma } from "@/lib/prisma";
import { sanitizeExternalId } from "@/lib/sanitize";
import { isPickupShippingMethod } from "@/lib/shipping";
import { SITE_NAME } from "@/lib/store-contact";
import { validateCartStock } from "@/lib/stock-validation";
import { LazyAddressForm } from "./LazyAddressForm";
import { type CheckoutAddressState } from "./state";

export const metadata: Metadata = {
  title: `Endereco | Checkout ${SITE_NAME}`,
  description: "Informe o endereco de entrega para continuar o checkout.",
};

type AddressSearchParams = {
  session_id?: string | string[];
  mp_payment_id?: string | string[];
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function mapAddressToValues(
  address: {
    fullName: string;
    document: string | null;
    phone: string;
    postalCode: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  } | null,
): CheckoutAddressValues {
  if (!address) {
    return emptyCheckoutAddressValues;
  }

  return {
    fullName: address.fullName,
    document: address.document ?? "",
    phone: address.phone,
    postalCode: address.postalCode,
    street: address.street,
    number: address.number,
    complement: address.complement ?? "",
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
  };
}

export default async function CheckoutAddressPage({
  searchParams,
}: {
  searchParams: Promise<AddressSearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const query = await searchParams;
  const stripeCheckoutSessionId = sanitizeExternalId(
    getSingleParam(query.session_id),
  );
  const mercadoPagoPaymentId = sanitizeExternalId(
    getSingleParam(query.mp_payment_id),
  );
  const cart =
    stripeCheckoutSessionId || mercadoPagoPaymentId
      ? await prisma.cart.findFirst({
          where: stripeCheckoutSessionId
            ? {
                stripeCheckoutSessionId,
              }
            : {
                mercadoPagoPaymentId,
              },
          include: cartInclude,
        })
      : await getCart(session?.user?.id ?? null);

  if (!cart || cart.items.length === 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-16 text-center">
        <ShoppingBag className="h-10 w-10 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-semibold tracking-tight">
          Seu carrinho esta vazio
        </h1>
        <p className="text-sm text-muted">
          Adicione produtos antes de informar o endereco de entrega.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
        >
          Ver produtos
        </Link>
      </main>
    );
  }

  const isPickup = isPickupShippingMethod(cart.shippingMethod);

  if (isPickup) {
    if (stripeCheckoutSessionId) {
      redirect(`/checkout/sucesso?session_id=${stripeCheckoutSessionId}`);
    }

    if (mercadoPagoPaymentId) {
      redirect(`/checkout/sucesso?mp_payment_id=${mercadoPagoPaymentId}`);
    }

    redirect("/checkout/pagamento");
  }

  const [address, summary] = await Promise.all([
    prisma.checkoutAddress.findUnique({
      where: {
        cartId: cart.id,
      },
    }),
    Promise.resolve(getCartSummary(cart)),
  ]);
  const stockValidation = validateCartStock(cart.items);
  const initialState: CheckoutAddressState = {
    status: "idle",
    message: "",
    errors: {},
    values: mapAddressToValues(address),
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl min-w-0 gap-5 px-4 py-6 sm:px-6 sm:py-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-8 xl:py-10">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <CheckoutHeader
          title="Endereço de entrega"
          description="Confira os dados do destinatário e o endereço para receber seus produtos. Estes dados ficam vinculados à sua compra."
        />

        {!cart.paidAt && !stockValidation.isValid ? (
          <div className="mt-6 rounded-lg border border-danger bg-red-50 p-4 text-sm text-danger">
            <p className="font-semibold">
              Revise o carrinho antes de continuar.
            </p>
            <ul className="mt-2 grid gap-1">
              {stockValidation.issues.map((issue) => (
                <li key={`${issue.productId}-${issue.code}`}>
                  {issue.message}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-lg border border-danger px-4 py-2 font-medium transition hover:bg-danger hover:text-background"
            >
              Voltar a loja
            </Link>
          </div>
        ) : (
          <div className="mt-5 min-w-0 sm:mt-6">
            <LazyAddressForm
              initialState={initialState}
              stripeCheckoutSessionId={stripeCheckoutSessionId}
              mercadoPagoPaymentId={mercadoPagoPaymentId}
            />
          </div>
        )}
      </section>

      <aside className="h-fit min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-semibold">Resumo da compra</h2>
        <CheckoutItems items={cart.items} />
        <div className="mt-5 grid gap-3 text-sm">
          <div className="flex min-w-0 items-center justify-between gap-4 text-muted">
            <span>Itens</span>
            <span>{summary.quantity}</span>
          </div>
          {summary.discountTotal > 0 && (
            <div className="flex min-w-0 items-center justify-between gap-4 text-primary">
              <span>Descontos</span>
              <span>-{currencyFormatter.format(summary.discountTotal)}</span>
            </div>
          )}
          <div className="flex min-w-0 items-center justify-between gap-4 text-muted">
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
          <div className="flex min-w-0 items-center justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">
              {currencyFormatter.format(summary.total)}
            </span>
          </div>
        </div>
        <Link
          href="/"
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted transition hover:border-primary/10 hover:text-primary"
        >
          Voltar a loja
        </Link>
      </aside>
    </main>
  );
}
