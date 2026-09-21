"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/StatusPage";
import { SITE_NAME } from "@/lib/store-contact";
import "./globals.css";

export default function GlobalError({
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
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <title>Erro - {SITE_NAME}</title>
        <StatusPage
          tone="error"
          eyebrow="Erro critico"
          title="A loja encontrou uma falha"
          description="Nao foi possivel carregar a estrutura principal agora. Tente novamente em instantes."
          actionLabel="Tentar novamente"
          onAction={unstable_retry}
          secondaryHref="/"
          secondaryLabel="Ir para o inicio"
        />
      </body>
    </html>
  );
}
