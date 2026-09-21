"use server";

import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { revalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";

function getString(formData: FormData, key: string) {
  return sanitizeText(formData.get(key));
}

function parseNumber(value: string, fieldName: string) {
  const normalizedValue = value.replace(/\./g, "").replace(",", ".");
  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`Informe um valor valido para ${fieldName}.`);
  }

  return numberValue;
}

function parseDate(value: string, fieldName: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Informe uma data valida para ${fieldName}.`);
  }

  return date;
}

const PROMOTIONS_PATH = "/dashboard/promocoes";
const PROMOTION_CREATED_PATH = `${PROMOTIONS_PATH}?created=1`;
const PROMOTION_UPDATED_PATH = `${PROMOTIONS_PATH}?updated=1`;
const PROMOTION_DELETED_PATH = `${PROMOTIONS_PATH}?deleted=1`;

function revalidatePromotionViews() {
  revalidateCatalogCache();
}

export async function createPromotion(formData: FormData) {
  const session = await requireAdminSession();

  const name = getString(formData, "name");
  const productId = getString(formData, "productId");
  const startDate = parseDate(getString(formData, "startDate"), "inicio");
  const endDate = parseDate(getString(formData, "endDate"), "fim");

  if (!name) {
    throw new Error("Informe o nome da promocao.");
  }

  if (!productId) {
    throw new Error("Selecione um produto.");
  }

  if (endDate <= startDate) {
    throw new Error("A data final deve ser maior que a data inicial.");
  }

  const discountPercent = parseNumber(
    getString(formData, "discountPercent") || "0",
    "percentual",
  );
  const discountFixed = parseNumber(
    getString(formData, "discountFixed") || "0",
    "desconto fixo",
  );

  if (discountPercent <= 0 && discountFixed <= 0) {
    throw new Error("Informe pelo menos um desconto.");
  }

  const promotion = await prisma.promotion.create({
    data: {
      name,
      description: getString(formData, "description") || null,
      productId,
      discountPercent,
      discountFixed,
      startDate,
      endDate,
      active: formData.get("active") === "on",
    },
  });

  if (promotion) {
    await recordAuditLog({
      action: "promotion.create",
      entity: "Promotion",
      entityId: promotion.id,
      actor: getAuditActor(session),
      metadata: {
        name: promotion.name,
        productId: promotion.productId,
        discountPercent: promotion.discountPercent,
        discountFixed: promotion.discountFixed,
        active: promotion.active,
        startDate: promotion.startDate.toISOString(),
        endDate: promotion.endDate.toISOString(),
      },
    });
  }

  revalidatePromotionViews();
  redirect(PROMOTION_CREATED_PATH);
}

export async function togglePromotion(formData: FormData) {
  const session = await requireAdminSession();

  const promotionId = getString(formData, "promotionId");
  const active = getString(formData, "active") === "true";

  if (!promotionId) {
    throw new Error("Promocao invalida.");
  }

  const promotion = await prisma.promotion.update({
    where: {
      id: promotionId,
    },
    data: {
      active,
    },
  });

  if (promotion) {
    await recordAuditLog({
      action: "promotion.toggle",
      entity: "Promotion",
      entityId: promotion.id,
      actor: getAuditActor(session),
      metadata: {
        active: promotion.active,
      },
    });
  }

  revalidatePromotionViews();
  redirect(PROMOTION_UPDATED_PATH);
}

export async function deletePromotion(formData: FormData) {
  const session = await requireAdminSession();

  const promotionId = getString(formData, "promotionId");

  if (!promotionId) {
    throw new Error("Promocao invalida.");
  }

  const promotion = await prisma.promotion.delete({
    where: {
      id: promotionId,
    },
  });

  if (promotion) {
    await recordAuditLog({
      action: "promotion.delete",
      entity: "Promotion",
      entityId: promotion.id,
      actor: getAuditActor(session),
      metadata: {
        name: promotion.name,
        productId: promotion.productId,
        active: promotion.active,
      },
    });
  }

  revalidatePromotionViews();
  redirect(PROMOTION_DELETED_PATH);
}
