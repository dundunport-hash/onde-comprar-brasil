"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type CopyPixPaymentLinkButtonProps = {
  paymentUrl: string;
};

export function CopyPixPaymentLinkButton({
  paymentUrl,
}: CopyPixPaymentLinkButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(paymentUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = paymentUrl;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      setIsCopied(true);
      showToast("Link de pagamento Pix copiado.", "success");
      window.setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast("Nao foi possivel copiar o link Pix.", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
      {isCopied ? "Link copiado" : "Copiar link Pix"}
    </button>
  );
}
