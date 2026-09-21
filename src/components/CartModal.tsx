"use client";

import dynamic from "next/dynamic";
import { type MouseEvent, useState } from "react";
import { ShoppingCart } from "lucide-react";

const Modal = dynamic(() => import("./Modal").then((mod) => mod.Modal), {
  loading: () => null,
  ssr: false,
});

type CartModalProps = {
  itemCount: number;
  children: React.ReactNode;
};

export function CartModal({ itemCount, children }: CartModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleModalClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a");

    const href = link?.getAttribute("href");
    if (href?.startsWith("/") && !href.startsWith("//")) {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-2 font-bold text-foreground transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Abrir carrinho"
      >
        <ShoppingCart
          className="h-8 w-8 text-institutional"
          aria-hidden="true"
        />
        <span className="hidden text-left text-xs leading-tight sm:inline">
          Meu carrinho
          <span className="block text-sm text-institutional">R$ 0,00</span>
        </span>
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-xs font-black text-foreground">
            {itemCount}
          </span>
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Carrinho"
        panelClassName="max-w-6xl"
      >
        <div onClickCapture={handleModalClick}>{children}</div>
      </Modal>
    </>
  );
}
