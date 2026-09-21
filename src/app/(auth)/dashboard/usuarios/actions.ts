"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";

const USERS_PATH = "/dashboard/usuarios";
const VALID_ROLES = new Set(["ADMIN", "USER"]);

function getString(formData: FormData, key: string) {
  return sanitizeText(formData.get(key), { maxLength: 120 });
}

function parseRole(value: string) {
  if (VALID_ROLES.has(value)) {
    return value;
  }

  throw new Error("Papel de usuario invalido.");
}

export async function updateUserRole(formData: FormData) {
  const session = await requireAdminSession();

  const userId = getString(formData, "userId");
  const role = parseRole(getString(formData, "role"));

  if (!userId) {
    throw new Error("Usuario invalido.");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!currentUser) {
    throw new Error("Usuario nao encontrado.");
  }

  if (currentUser.role === "ADMIN" && role !== "ADMIN") {
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new Error("Mantenha pelo menos um administrador ativo.");
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role,
    },
  });

  if (updatedUser) {
    await recordAuditLog({
      action: "user.role.update",
      entity: "User",
      entityId: updatedUser.id,
      actor: getAuditActor(session),
      metadata: {
        previousRole: currentUser.role,
        nextRole: updatedUser.role,
      },
    });
  }

  revalidatePath(USERS_PATH);
  revalidatePath("/dashboard");

  if (session.user?.id === userId && role !== "ADMIN") {
    revalidatePath("/", "layout");
  }
}
