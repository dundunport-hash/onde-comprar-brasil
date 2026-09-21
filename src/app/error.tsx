"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/StatusPage";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      tone="error"
      eyebrow="Algo saiu do esperado"
      title="Nao conseguimos carregar esta pagina"
      description="Aconteceu uma falha temporaria. Voce pode tentar novamente ou voltar para o inicio da loja."
      actionLabel="Tentar novamente"
      onAction={unstable_retry}
      secondaryHref="/"
      secondaryLabel="Ir para o inicio"
    />
  );
}
