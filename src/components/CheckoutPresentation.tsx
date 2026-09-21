import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";
import { SITE_NAME } from "@/lib/store-contact";

export function CheckoutHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="min-w-0">
      <nav
        aria-label="Navegação do checkout"
        className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <Link
          href="/#catalogo"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar à loja
        </Link>
        <Link
          href="/contato"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Headphones className="h-4 w-4" aria-hidden="true" /> Precisa de
          ajuda?
        </Link>
      </nav>
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        {SITE_NAME} · Checkout
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </header>
  );
}

export function CheckoutItems({
  items,
}: {
  items: { id: string; quantity: number; product: { name: string } }[];
}) {
  return (
    <ul
      aria-label="Produtos da compra"
      className="mt-4 divide-y divide-border border-y border-border"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className="flex min-w-0 justify-between gap-3 py-3 text-sm"
        >
          <span className="min-w-0 break-words font-medium">
            {item.product.name}
          </span>
          <span className="shrink-0 text-muted">{item.quantity} un.</span>
        </li>
      ))}
    </ul>
  );
}
