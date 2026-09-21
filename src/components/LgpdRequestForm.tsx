"use client";

import { useState } from "react";
import { CheckCircle2, Send, ShieldAlert } from "lucide-react";

const requestTypes = [
  { value: "confirmation", label: "Confirmacao de tratamento" },
  { value: "access", label: "Acesso aos dados" },
  { value: "correction", label: "Correcao de dados incompletos" },
  { value: "anonymization", label: "Anonimizacao ou bloqueio" },
  { value: "portability", label: "Portabilidade" },
  { value: "deletion", label: "Eliminacao de dados" },
  { value: "consent", label: "Revogacao de consentimento" },
  { value: "review", label: "Revisao de decisao automatizada" },
  { value: "information", label: "Informacoes sobre compartilhamento" },
];

type SubmitState = {
  status: "idle" | "success" | "error";
  message: string;
  protocol?: string;
};

export function LgpdRequestForm() {
  const [state, setState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setState({ status: "idle", message: "" });

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/lgpd/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          requestType: formData.get("requestType"),
          details: formData.get("details"),
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
        protocol?: string;
      };

      if (!response.ok) {
        setState({
          status: "error",
          message: body.error ?? "Nao foi possivel enviar a solicitacao.",
        });
        return;
      }

      event.currentTarget.reset();
      setState({
        status: "success",
        message:
          body.message ??
          "Solicitacao registrada. Nossa equipe fara a triagem.",
        protocol: body.protocol,
      });
    } catch {
      setState({
        status: "error",
        message: "Erro de conexao ao registrar a solicitacao.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="name">
            Nome completo
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="email"
          >
            E-mail para retorno
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="requestType"
        >
          Direito que deseja exercer
        </label>
        <select
          id="requestType"
          name="requestType"
          required
          defaultValue=""
          className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
        >
          <option value="" disabled>
            Selecione uma opcao
          </option>
          {requestTypes.map((requestType) => (
            <option key={requestType.value} value={requestType.value}>
              {requestType.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="details"
        >
          Descricao da solicitacao
        </label>
        <textarea
          id="details"
          name="details"
          required
          maxLength={1200}
          rows={5}
          className="resize-y rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          placeholder="Informe o contexto minimo para localizarmos seu cadastro, pedido ou contato."
        />
      </div>

      {state.message && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-4 w-4" aria-hidden="true" />
          )}
          <div>
            <p>{state.message}</p>
            {state.protocol && (
              <p className="mt-1 font-semibold">Protocolo: {state.protocol}</p>
            )}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Enviando..." : "Enviar solicitacao"}
      </button>
    </form>
  );
}
