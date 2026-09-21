"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

function getCallbackUrl() {
  const callbackUrl = new URLSearchParams(window.location.search).get(
    "callbackUrl",
  );

  if (!callbackUrl?.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/dashboard";
  }

  return callbackUrl;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        const message = "E-mail ou senha invalidos. Tente novamente.";
        setError(message);
        showToast(message, "error");
        return;
      }

      if (result?.ok) {
        const message = "Login realizado com sucesso. Redirecionando...";
        setSuccess(message);
        showToast(message);
        window.location.href = getCallbackUrl();
      }
    } catch {
      const message = "Nao foi possivel fazer login agora. Tente novamente.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const feedback = error
    ? { type: "error" as const, message: error }
    : success
      ? { type: "success" as const, message: success }
      : null;

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm text-muted">
          Use o seu e-mail e senha para acessar a area administrativa.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-foreground">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          {feedback && (
            <div
              role={feedback.type === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                feedback.type === "error"
                  ? "border-red-200 bg-red-50 text-danger"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              {feedback.type === "error" ? (
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Carregando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/forgot-password"
            className="text-sm text-primary hover:text-primary-hover"
          >
            Esqueci minha senha
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Ainda nao tem conta?{" "}
          <a
            href="/register"
            className="font-semibold text-primary hover:text-primary/80"
          >
            Registre-se aqui
          </a>
          .
        </p>
      </div>
    </main>
  );
}
