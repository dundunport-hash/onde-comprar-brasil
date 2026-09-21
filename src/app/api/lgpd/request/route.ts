import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import {
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";

const VALID_REQUEST_TYPES = new Set([
  "confirmation",
  "access",
  "correction",
  "anonymization",
  "portability",
  "deletion",
  "consent",
  "review",
  "information",
]);

function getRequestType(value: unknown) {
  const requestType = sanitizeText(typeof value === "string" ? value : "", {
    maxLength: 40,
  });

  return VALID_REQUEST_TYPES.has(requestType) ? requestType : "";
}

export async function POST(request: Request) {
  try {
    const ipLimit = consumeRateLimit({
      key: createRateLimitKey("lgpd-request:ip", getClientIp(request)),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(ipLimit);
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      requestType?: string;
      details?: string;
    };
    const name = sanitizeText(body.name, { maxLength: 120 });
    const email = sanitizeEmail(body.email);
    const requestType = getRequestType(body.requestType);
    const details = sanitizeText(body.details, {
      maxLength: 1200,
      preserveNewlines: true,
    });

    if (!name || !email || !requestType || !details) {
      return NextResponse.json(
        { error: "Preencha nome, e-mail, tipo de solicitacao e descricao." },
        { status: 400 },
      );
    }

    const protocol = `LGPD-${Date.now().toString(36).toUpperCase()}`;

    await recordAuditLog({
      action: "lgpd.request.submit",
      entity: "PrivacyRequest",
      entityId: protocol,
      actor: {
        email,
      },
      metadata: {
        protocol,
        requestType,
        requesterName: name,
        requesterEmail: email,
        detailsPreview: details.slice(0, 180),
        detailsLength: details.length,
      },
    });

    return NextResponse.json({
      protocol,
      message:
        "Solicitacao LGPD registrada. Use o protocolo para acompanhar o atendimento.",
    });
  } catch (error) {
    console.error("Erro ao registrar solicitacao LGPD:", error);
    return NextResponse.json(
      { error: "Nao foi possivel registrar a solicitacao agora." },
      { status: 500 },
    );
  }
}
