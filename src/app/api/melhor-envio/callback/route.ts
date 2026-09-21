import { type NextRequest } from "next/server";
import { colorTokens } from "@/lib/design";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const DEFAULT_API_URL = "https://www.melhorenvio.com.br";

function getMelhorEnvioBaseUrl() {
  return (env.MELHOR_ENVIO_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

function getRedirectUri(request: NextRequest) {
  return `${env.NEXT_PUBLIC_URL ?? request.nextUrl.origin}/api/melhor-envio/callback`;
}

function getOAuthConfig() {
  const clientId = env.Client_ID_Melhor_envio;
  const clientSecret = env.Secret_Melhor_envio;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Configure Client_ID_Melhor_envio e Secret_Melhor_envio no .env.",
    );
  }

  return { clientId, clientSecret };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlResponse(title: string, body: string, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: ${colorTokens.background}; color: ${colorTokens.foreground}; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { max-width: 760px; width: 100%; border: 1px solid ${colorTokens.border}; background: ${colorTokens.surface}; border-radius: 8px; padding: 24px; box-shadow: 0 10px 30px rgba(15, 23, 42, .08); }
      h1 { margin: 0 0 12px; font-size: 28px; line-height: 1.2; }
      p { color: ${colorTokens.muted}; }
      pre { overflow: auto; border-radius: 8px; background: ${colorTokens.foreground}; color: ${colorTokens.primaryForeground}; padding: 16px; }
      a { color: ${colorTokens.primary}; font-weight: 700; }
    </style>
  </head>
  <body>
    <main><section>${body}</section></main>
  </body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");

  if (error) {
    return htmlResponse(
      "Melhor Envio - autorizacao recusada",
      `<h1>Autorizacao recusada</h1><p>${escapeHtml(error)}</p>`,
      400,
    );
  }

  if (!code) {
    return htmlResponse(
      "Melhor Envio - callback",
      "<h1>Callback do Melhor Envio</h1><p>Nenhum codigo OAuth foi recebido. Inicie a autorizacao pelo painel do Melhor Envio usando esta URL como callback.</p>",
      400,
    );
  }

  try {
    const { clientId, clientSecret } = getOAuthConfig();
    const response = await fetch(`${getMelhorEnvioBaseUrl()}/oauth/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(request),
        code,
      }),
      cache: "no-store",
    });
    const data = await response.json();

    if (!response.ok) {
      return htmlResponse(
        "Melhor Envio - falha no token",
        `<h1>Nao foi possivel gerar o token</h1><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`,
        response.status,
      );
    }

    const accessToken =
      typeof data.access_token === "string" ? data.access_token : "";
    const refreshToken =
      typeof data.refresh_token === "string" ? data.refresh_token : "";

    return htmlResponse(
      "Melhor Envio autorizado",
      `<h1>Melhor Envio autorizado</h1>
      <p>Adicione estes valores ao .env e reinicie o servidor para habilitar compra e impressao de etiquetas.</p>
      <pre>Access_Token_Melhor_envio=${escapeHtml(accessToken)}
Refresh_Token_Melhor_envio=${escapeHtml(refreshToken)}
MELHOR_ENVIO_TOKEN=${escapeHtml(accessToken)}</pre>
      <p>Depois disso, volte para <a href="/dashboard/pedidos">Pedidos</a>.</p>`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha inesperada no callback do Melhor Envio.";

    return htmlResponse(
      "Melhor Envio - erro",
      `<h1>Erro no callback</h1><p>${escapeHtml(message)}</p>`,
      500,
    );
  }
}
