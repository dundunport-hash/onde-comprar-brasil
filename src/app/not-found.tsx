import { StatusPage } from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      tone="not-found"
      code="404"
      title="Pagina nao encontrada"
      description="A pagina que voce procura nao existe, foi movida ou esta temporariamente indisponivel."
      actionHref="/"
      actionLabel="Voltar para o inicio"
      secondaryHref="/contato"
      secondaryLabel="Falar com a loja"
    />
  );
}
