import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { sanitizeHexToken } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    const ipLimit = consumeRateLimit({
      key: createRateLimitKey("verify-reset-token:ip", getClientIp(request)),
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(ipLimit);
    }

    const { searchParams } = new URL(request.url);
    const rawToken = searchParams.get("token");
    const token = sanitizeHexToken(rawToken);

    if (!rawToken) {
      return NextResponse.json(
        { error: "Token é obrigatório." },
        { status: 400 },
      );
    }

    // Verificar se o token existe e não expirou
    if (!token) {
      return NextResponse.json(
        { error: "Token invalido ou expirado." },
        { status: 400 },
      );
    }

    const tokenLimit = consumeRateLimit({
      key: createRateLimitKey("verify-reset-token:token", token),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!tokenLimit.allowed) {
      return rateLimitExceededResponse(tokenLimit);
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token invalido ou expirado." },
        { status: 400 },
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Erro ao verificar token:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
