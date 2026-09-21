"use server";

import { StockMovementType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { revalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { sanitizeOptionalText, sanitizeText } from "@/lib/sanitize";
import { getMovementQuantity, getNewStockQuantity } from "@/lib/stock";

async function assertAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Acesso negado.");
  }

  return session;
}

function getString(formData: FormData, key: string) {
  return sanitizeText(formData.get(key));
}

function getOptionalString(formData: FormData, key: string) {
  return sanitizeOptionalText(formData.get(key));
}

function parseQuantity(value: string) {
  const quantity = Number(value);

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Informe uma quantidade valida.");
  }

  return quantity;
}

function parseMovementType(value: string) {
  if (Object.values(StockMovementType).includes(value as StockMovementType)) {
    return value as StockMovementType;
  }

  throw new Error("Tipo de movimentacao invalido.");
}

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Informe uma data de validade valida.");
  }

  return date;
}

export async function createStockMovement(formData: FormData) {
  const session = await assertAdmin();

  const productId = getString(formData, "productId");
  const stockId = getOptionalString(formData, "stockId");
  const type = parseMovementType(getString(formData, "type"));
  const quantity = parseQuantity(getString(formData, "quantity"));
  const batch = getOptionalString(formData, "batch");
  const reason = getOptionalString(formData, "reason");
  const notes = getOptionalString(formData, "notes");
  const expirationDate = parseOptionalDate(
    getOptionalString(formData, "expirationDate"),
  );

  if (!productId) {
    throw new Error("Selecione um produto.");
  }

  const auditMetadata = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new Error("Produto nao encontrado.");
    }

    const stock =
      stockId !== null
        ? await tx.stock.findUnique({
            where: { id: stockId },
          })
        : await tx.stock.create({
            data: {
              productId,
              batch,
              expirationDate,
            },
          });

    if (!stock || stock.productId !== productId) {
      throw new Error("Lote de estoque invalido.");
    }

    const newQuantity = getNewStockQuantity({
      type,
      currentQuantity: stock.quantity,
      quantity,
    });
    const movementQuantity = getMovementQuantity({
      type,
      currentQuantity: stock.quantity,
      quantity,
    });

    await tx.stock.update({
      where: { id: stock.id },
      data: {
        quantity: newQuantity,
        batch: batch ?? stock.batch,
        expirationDate: expirationDate ?? stock.expirationDate,
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        type,
        quantity: movementQuantity,
        previousQuantity: stock.quantity,
        newQuantity,
        reason,
        notes,
        expirationDate: expirationDate ?? stock.expirationDate,
        productId,
        stockId: stock.id,
        createdById: session.user?.id,
      },
    });

    const aggregate = await tx.stock.aggregate({
      where: { productId },
      _sum: {
        quantity: true,
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        stock: aggregate._sum.quantity ?? 0,
      },
    });

    return {
      productId,
      productName: product.name,
      stockId: stock.id,
      stockMovementId: movement?.id ?? null,
      type,
      quantity: movementQuantity,
      previousQuantity: stock.quantity,
      newQuantity,
      batch: batch ?? stock.batch,
      expirationDate:
        (expirationDate ?? stock.expirationDate)?.toISOString() ?? null,
      reason,
      notes,
      totalProductStock: aggregate._sum.quantity ?? 0,
    };
  });

  await recordAuditLog({
    action: "stock.movement.create",
    entity: "StockMovement",
    entityId: auditMetadata.stockMovementId,
    actor: getAuditActor(session),
    metadata: auditMetadata,
  });

  revalidateCatalogCache();
}
