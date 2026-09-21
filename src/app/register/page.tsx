"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { useToast } from "@/components/ToastProvider";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      const message = "As senhas nao coincidem.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!termsAccepted) {
      const message = "Voce precisa aceitar os Termos de Uso para criar conta.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          imageUrl,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.error || "Nao foi possivel criar a conta.";
        setError(message);
        showToast(message, "error");
        return;
      }

      const message = "Conta criada com sucesso! Voce ja pode fazer login.";
      setSuccess(message);
      showToast(message);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTermsAccepted(false);
      setImageUrl(null);
    } catch {
      const message = "Nao foi possivel criar a conta agora. Tente novamente.";
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
        <h1 className="text-3xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mt-2 text-sm text-muted">
          Cadastre-se para acessar o painel administrativo.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-foreground">
              Foto de perfil
            </label>
            <div className="mt-2">
              <CloudinaryUpload
                value={imageUrl}
                label="Enviar foto do computador"
                previewAlt="Previa da foto de perfil"
                folder="usuarios"
                onChange={setImageUrl}
                onUploadingChange={setImageLoading}
              />
            </div>
            {imageUrl && (
              <p className="mt-2 text-xs text-success">Imagem enviada.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">
              Nome
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              placeholder="Seu nome"
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-foreground">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              required
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              Li e concordo com os{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Termos de Uso
              </Link>
              .
            </span>
          </label>

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
            disabled={loading || imageLoading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
