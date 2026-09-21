import Link from "next/link";
import type { Metadata } from "next";
import { CheckoutHeader } from "@/components/CheckoutPresentation";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Pagamento cancelado | ${SITE_NAME}`,
  description: "Pagamento cancelado no Stripe.",
};

export default function CheckoutCanceledPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-8">
        <CheckoutHeader
          title="Pagamento cancelado"
          description="Você saiu do pagamento por cartão. Confira o carrinho antes de tentar novamente ou escolher outra forma de pagamento."
        />
        <Link
          href="/checkout/pagamento"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Voltar ao pagamento
        </Link>
      </section>
    </main>
  );
}
