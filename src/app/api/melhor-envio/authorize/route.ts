import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const DEFAULT_API_URL = "https://www.melhorenvio.com.br";
const REQUIRED_SCOPES = [
  "shipping-calculate",
  "shipping-checkout",
  "shipping-generate",
  "shipping-print",
  "shipping-tracking",
];

function getMelhorEnvioBaseUrl() {
  return (env.MELHOR_ENVIO_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

function getRedirectUri(request: NextRequest) {
  return `${env.NEXT_PUBLIC_URL ?? request.nextUrl.origin}/api/melhor-envio/callback`;
}

export async function GET(request: NextRequest) {
  if (!env.Client_ID_Melhor_envio) {
    return Response.json(
      {
        error: "Configure Client_ID_Melhor_envio no .env.",
      },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: env.Client_ID_Melhor_envio,
    redirect_uri: getRedirectUri(request),
    response_type: "code",
    scope: REQUIRED_SCOPES.join(" "),
  });

  redirect(`${getMelhorEnvioBaseUrl()}/oauth/authorize?${params}`);
}
