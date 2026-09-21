import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { normalizeUserImage } from "@/lib/user-image";

export async function POST(request: Request) {
  try {
    const ipLimit = consumeRateLimit({
      key: createRateLimitKey("register:ip", getClientIp(request)),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(ipLimit);
    }

    const body = await request.json();
    const {
      email: rawEmail,
      password,
      name: rawName,
      imageUrl,
      termsAccepted,
    } = body as {
      email?: string;
      password?: string;
      name?: string;
      imageUrl?: string;
      termsAccepted?: boolean;
    };
    const email = sanitizeEmail(rawEmail);
    const name = sanitizeText(rawName, { maxLength: 120 });

    if (!email || typeof password !== "string" || password.length === 0) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 },
      );
    }

    if (termsAccepted !== true) {
      return NextResponse.json(
        { error: "Voce precisa aceitar os Termos de Uso para criar conta." },
        { status: 400 },
      );
    }

    const emailLimit = consumeRateLimit({
      key: createRateLimitKey("register:email", email),
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });

    if (!emailLimit.allowed) {
      return rateLimitExceededResponse(emailLimit);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com este e-mail." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        image: normalizeUserImage(imageUrl),
      },
    });

    await recordAuditLog({
      action: "user.register",
      entity: "User",
      entityId: user.id,
      actor: {
        id: user.id,
        email: user.email,
      },
      metadata: {
        hasImage: Boolean(user.image),
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao criar conta. Tente novamente mais tarde." },
      { status: 500 },
    );
  }
}
