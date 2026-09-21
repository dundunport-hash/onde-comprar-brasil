import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { sanitizeHexToken } from "@/lib/sanitize";

export async function POST(request: Request) {
  try {
    const ipLimit = consumeRateLimit({
      key: createRateLimitKey("reset-password:ip", getClientIp(request)),
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(ipLimit);
    }

    const { token: rawToken, password } = (await request.json()) as {
      token?: string;
      password?: string;
    };
    const token = sanitizeHexToken(rawToken);

    if (!rawToken || typeof password !== "string") {
      return NextResponse.json(
        { error: "Token e senha são obrigatórios." },
        { status: 400 },
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token invalido ou expirado." },
        { status: 400 },
      );
    }

    const tokenLimit = consumeRateLimit({
      key: createRateLimitKey("reset-password:token", token),
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!tokenLimit.allowed) {
      return rateLimitExceededResponse(tokenLimit);
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    // Verificar se o token existe e não expirou
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token invalido ou expirado." },
        { status: 400 },
      );
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(password, 12);

    // Atualizar senha e limpar token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await recordAuditLog({
      action: "auth.password_reset.complete",
      entity: "User",
      entityId: user.id,
      actor: {
        id: user.id,
        email: user.email,
      },
    });

    return NextResponse.json({
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
