import crypto from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { recordAuditLog } from "@/lib/audit";
import { colorTokens } from "@/lib/design";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  createRateLimitKey,
  getClientIp,
  rateLimitExceededResponse,
} from "@/lib/rate-limit";
import { escapeHtml, sanitizeEmail, sanitizeText } from "@/lib/sanitize";
import { SITE_NAME } from "@/lib/store-contact";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  try {
    const ipLimit = consumeRateLimit({
      key: createRateLimitKey("forgot-password:ip", getClientIp(request)),
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return rateLimitExceededResponse(ipLimit);
    }

    const { email: rawEmail } = (await request.json()) as { email?: string };
    const email = sanitizeEmail(rawEmail);

    if (!email) {
      return NextResponse.json(
        { error: "E-mail e obrigatorio." },
        { status: 400 },
      );
    }

    const emailLimit = consumeRateLimit({
      key: createRateLimitKey("forgot-password:email", email),
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });

    if (!emailLimit.allowed) {
      return rateLimitExceededResponse(emailLimit);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        message:
          "Se o e-mail existir em nossa base, enviamos instrucoes para redefinir sua senha.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    await recordAuditLog({
      action: "auth.password_reset.request",
      entity: "User",
      entityId: user.id,
      actor: {
        id: user.id,
        email: user.email,
      },
      metadata: {
        emailSent: Boolean(resend),
        expiresAt: resetTokenExpiry.toISOString(),
      },
    });

    const resetUrl = `${env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
    const userName = escapeHtml(
      sanitizeText(user.name, { maxLength: 120 }) || "usuario",
    );

    if (resend) {
      try {
        await resend.emails.send({
          from: `${SITE_NAME} <noreply@drogariamegapopular.com>`,
          to: email,
          subject: `Redefinicao de senha - ${SITE_NAME}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: ${colorTokens.primary};">Redefinicao de senha</h2>
              <p>Ola ${userName},</p>
              <p>Recebemos uma solicitacao para redefinir sua senha. Clique no link abaixo para criar uma nova senha:</p>
              <p style="margin: 20px 0;">
                <a href="${resetUrl}" style="background-color: ${colorTokens.primary}; color: ${colorTokens.primaryForeground}; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Redefinir senha
                </a>
              </p>
              <p>Este link e valido por 1 hora.</p>
              <p>Se voce nao solicitou esta redefinicao, ignore este e-mail.</p>
              <p>Atenciosamente,<br>${SITE_NAME}</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
      }
    } else {
      console.warn("RESEND_API_KEY nao configurada - email nao enviado");
    }

    return NextResponse.json({
      message:
        "Se o e-mail existir em nossa base, enviamos instrucoes para redefinir sua senha.",
    });
  } catch (error) {
    console.error("Erro na recuperacao de senha:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
