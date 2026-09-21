"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { authOptions } from "@/lib/auth";
import { revalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import {
  sanitizeExternalId,
  sanitizeHttpUrl,
  sanitizeOptionalText,
  sanitizeText,
} from "@/lib/sanitize";

const PRODUCTS_PATH = "/dashboard/produtos";
const PRODUCT_CREATED_PATH = `${PRODUCTS_PATH}?created=1`;
const PRODUCT_UPDATED_PATH = `${PRODUCTS_PATH}?updated=1`;
const PRODUCT_DELETED_PATH = `${PRODUCTS_PATH}?deleted=1`;

async function assertAdmin() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    throw new Error("Acesso negado.");
  }

  return session;
}

function getString(
  formData: FormData,
  key: string,
  options?: { maxLength?: number; preserveNewlines?: boolean },
) {
  return sanitizeText(formData.get(key), options);
}

function getOptionalString(
  formData: FormData,
  key: string,
  options?: { maxLength?: number; preserveNewlines?: boolean },
) {
  return sanitizeOptionalText(formData.get(key), options);
}

function getOptionalUrl(formData: FormData, key: string) {
  return sanitizeHttpUrl(formData.get(key));
}

function parseCurrency(value: string) {
  const hasComma = value.includes(",");
  const hasOnlyBrazilianThousands = /^\d{1,3}(\.\d{3})+$/.test(value);
  const normalizedValue = hasComma
    ? value.replace(/\./g, "").replace(",", ".")
    : hasOnlyBrazilianThousands
      ? value.replace(/\./g, "")
      : value;
  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error("Informe um preço válido.");
  }

  return numberValue;
}

function parsePercent(value: string, fieldName: string) {
  const normalizedValue = value.replace(",", ".");
  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 100) {
    throw new Error(`Informe um percentual valido para ${fieldName}.`);
  }

  return numberValue;
}

function parseStock(value: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error("Informe um estoque válido.");
  }

  return numberValue;
}

function parsePositiveDecimal(
  value: string,
  fieldName: string,
  fallback: number,
) {
  const normalizedValue = value.replace(",", ".");
  const numberValue = Number(normalizedValue || fallback);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`Informe um valor valido para ${fieldName}.`);
  }

  return numberValue;
}

function parseEan(value: string) {
  if (!value) {
    return null;
  }

  if (!/^\d{1,14}$/.test(value)) {
    throw new Error("Informe um EAN valido com ate 14 digitos.");
  }

  return BigInt(value);
}

function getInitialDiscountEndDate(referenceDate: Date) {
  const endDate = new Date(referenceDate);
  endDate.setFullYear(endDate.getFullYear() + 10);
  return endDate;
}

function buildInitialStockCreate(stock: number) {
  if (stock <= 0) {
    return undefined;
  }

  return {
    create: {
      batch: "Lote inicial",
      quantity: stock,
      reservedQuantity: 0,
      minimumQuantity: 0,
    },
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getUniqueSlug(name: string, currentProductId?: string) {
  const baseSlug = slugify(name);

  if (!baseSlug) {
    throw new Error("Informe um nome válido para gerar o slug.");
  }

  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existingProduct || existingProduct.id === currentProductId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function parseProductForm(formData: FormData) {
  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Informe o nome do produto.");
  }

  return {
    name,
    description: getOptionalString(formData, "description", {
      maxLength: 5000,
      preserveNewlines: true,
    }),
    technicalData: getOptionalString(formData, "technicalData", {
      maxLength: 5000,
      preserveNewlines: true,
    }),
    imageUrl: getOptionalUrl(formData, "imageUrl"),
    imageUrl2: getOptionalUrl(formData, "imageUrl2"),
    imageUrl3: getOptionalUrl(formData, "imageUrl3"),
    ean: parseEan(getString(formData, "ean")),
    price: parseCurrency(getString(formData, "price")),
    stock: parseStock(getString(formData, "stock")),
    lengthCm: parsePositiveDecimal(
      getString(formData, "lengthCm"),
      "comprimento",
      20,
    ),
    widthCm: parsePositiveDecimal(
      getString(formData, "widthCm"),
      "largura",
      16,
    ),
    heightCm: parsePositiveDecimal(
      getString(formData, "heightCm"),
      "altura",
      5,
    ),
    weightKg: parsePositiveDecimal(
      getString(formData, "weightKg"),
      "peso",
      0.5,
    ),
    active: formData.get("active") === "on",
    categoryId: getOptionalString(formData, "categoryId"),
  };
}

export async function createProduct(formData: FormData) {
  const session = await assertAdmin();

  const data = parseProductForm(formData);
  const initialDiscountPercent = parsePercent(
    getString(formData, "initialDiscountPercent") || "0",
    "desconto inicial",
  );
  const slug = await getUniqueSlug(data.name);
  const now = new Date();

  const product = await prisma.product.create({
    data: {
      ...data,
      slug,
      prices: {
        create: {
          price: data.price,
        },
      },
      stocks: buildInitialStockCreate(data.stock),
      promotions:
        initialDiscountPercent > 0
          ? {
              create: {
                name: "Desconto inicial",
                description: "Desconto cadastrado junto com o produto.",
                discountPercent: initialDiscountPercent,
                discountFixed: 0,
                startDate: now,
                endDate: getInitialDiscountEndDate(now),
                active: true,
              },
            }
          : undefined,
    },
  });

  if (product) {
    await recordAuditLog({
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      actor: getAuditActor(session),
      metadata: {
        name: product.name,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm,
        weightKg: product.weightKg,
        ean: product.ean?.toString() ?? null,
        initialDiscountPercent,
        active: product.active,
        categoryId: product.categoryId,
      },
    });
  }

  revalidateCatalogCache();
  redirect(PRODUCT_CREATED_PATH);
}

export async function updateProduct(productId: string, formData: FormData) {
  const session = await assertAdmin();
  const safeProductId = sanitizeExternalId(productId);

  if (!safeProductId) {
    throw new Error("Produto invalido.");
  }

  const data = parseProductForm(formData);
  const slug = await getUniqueSlug(data.name, safeProductId);

  const currentProduct = await prisma.product.findUnique({
    where: { id: safeProductId },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      weightKg: true,
      ean: true,
      active: true,
      categoryId: true,
      _count: {
        select: {
          stocks: true,
        },
      },
    },
  });

  if (!currentProduct) {
    throw new Error("Produto não encontrado.");
  }

  const product = await prisma.product.update({
    where: { id: safeProductId },
    data: {
      ...data,
      slug,
      stocks:
        currentProduct._count.stocks === 0
          ? buildInitialStockCreate(data.stock)
          : undefined,
      prices:
        currentProduct.price !== data.price
          ? {
              create: {
                price: data.price,
              },
            }
          : undefined,
    },
  });

  if (product) {
    await recordAuditLog({
      action: "product.update",
      entity: "Product",
      entityId: product.id,
      actor: getAuditActor(session),
      metadata: {
        before: {
          ...currentProduct,
          ean: currentProduct.ean?.toString() ?? null,
        },
        after: {
          name: product.name,
          slug: product.slug,
          price: product.price,
          stock: product.stock,
          lengthCm: product.lengthCm,
          widthCm: product.widthCm,
          heightCm: product.heightCm,
          weightKg: product.weightKg,
          ean: product.ean?.toString() ?? null,
          active: product.active,
          categoryId: product.categoryId,
        },
      },
    });
  }

  revalidateCatalogCache();
  redirect(PRODUCT_UPDATED_PATH);
}

export async function deleteProduct(formData: FormData) {
  const session = await assertAdmin();

  const productId = getString(formData, "productId");

  if (!productId) {
    throw new Error("Produto inválido.");
  }

  const product = await prisma.product.delete({
    where: { id: productId },
  });

  if (product) {
    await recordAuditLog({
      action: "product.delete",
      entity: "Product",
      entityId: product.id,
      actor: getAuditActor(session),
      metadata: {
        name: product.name,
        slug: product.slug,
        price: product.price,
        stock: product.stock,
        ean: product.ean?.toString() ?? null,
        active: product.active,
        categoryId: product.categoryId,
      },
    });
  }

  revalidateCatalogCache();
  redirect(PRODUCT_DELETED_PATH);
}
