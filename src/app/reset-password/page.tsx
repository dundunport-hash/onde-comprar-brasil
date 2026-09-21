"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";
import { sanitizeHexToken } from "@/lib/sanitize";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string>("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = sanitizeHexToken(searchParams.get("token"));

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setTokenError("Token de redefinição inválido ou expirado.");
        return;
      }

      try {
        const params = new URLSearchParams({ token });
        const res = await fetch(`/api/auth/verify-reset-token?${params}`);
        if (res.ok) {
          setIsValidToken(true);
          setTokenError("");
        } else {
          setIsValidToken(false);
          setTokenError("Token de redefinição inválido ou expirado.");
        }
      } catch {
        setIsValidToken(false);
        setTokenError("Erro ao verificar token.");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          "Senha redefinida com sucesso! Redirecionando para o login...",
        );
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error || "Erro ao redefinir senha.");
      }
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/10 mx-auto mb-4"></div>
          <p className="text-muted">Verificando token...</p>
        </div>
      </main>
    );
  }

  if (!isValidToken) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Link inválido
            </h1>
            <p className="text-error mb-6">{tokenError}</p>
            <Button onClick={() => router.push("/forgot-password")}>
              Solicitar novo link
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Redefinir senha
          </h1>
          <p className="text-muted">Digite sua nova senha</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nova senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua nova senha"
            required
            minLength={6}
          />

          <Input
            label="Confirmar senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme sua nova senha"
            required
            minLength={6}
          />

          {error && (
            <div className="text-error text-sm text-center">{error}</div>
          )}

          {message && (
            <div className="text-success text-sm text-center">{message}</div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
