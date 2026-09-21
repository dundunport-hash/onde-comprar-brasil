import type { DummyJsonProduct } from "@/lib/dummyjson";
import { roundMoney } from "@/lib/pricing";
import {
  sanitizeExternalId,
  sanitizeHttpUrl,
  sanitizeOptionalText,
  sanitizeText,
} from "@/lib/sanitize";

/**
 * Tipos de dominio do produto eletronico.
 *
 * A UI (etapas 05-08) deve consumir somente estes tipos. Nenhum campo do DTO da
 * API fake (`discountPercentage`, `availabilityStatus`, `warrantyInformation`,
 * ...) atravessa o adapter. O mesmo tipo serve para produtos do banco quando a
 * origem for trocada (`source: "catalog"`).
 */
export const ELECTRONIC_PRODUCT_SOURCES = ["dummyjson", "catalog"] as const;

export type ElectronicProductSource =
  (typeof ELECTRONIC_PRODUCT_SOURCES)[number];

export const ELECTRONIC_PRODUCT_SOURCE: ElectronicProductSource = "dummyjson";

export type ElectronicProductAvailability =
  | "in-stock"
  | "low-stock"
  | "out-of-stock";

export type ElectronicProductCategory = {
  slug: string;
  name: string;
};

export type ElectronicProductSpec = {
  label: string;
  value: string;
};

export type ElectronicProductPrice = {
  base: number;
  final: number;
  discount: number;
  discountPercent: number;
};

export type ElectronicProductStock = {
  quantity: number;
  available: boolean;
  availability: ElectronicProductAvailability;
};

export type ElectronicProduct = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  brand: string;
  category: ElectronicProductCategory;
  price: ElectronicProductPrice;
  stock: ElectronicProductStock;
  thumbnail: string;
  images: string[];
  description: string;
  specs: ElectronicProductSpec[];
  rating: number;
  reviews: number;
  warranty: string | null;
  shipping: string | null;
  returnPolicy: string | null;
  tags: string[];
  source: ElectronicProductSource;
};

/** Categorias de eletronicos do DummyJSON recomendadas para o prototipo. */
export const ELECTRONIC_PRODUCT_CATEGORIES = [
  { slug: "smartphones", name: "Smartphones" },
  { slug: "laptops", name: "Notebooks" },
  { slug: "tablets", name: "Tablets" },
  { slug: "mobile-accessories", name: "Acessórios para celular" },
] as const;

const CATEGORY_NAMES = new Map<string, string>(
  ELECTRONIC_PRODUCT_CATEGORIES.map(
    (category) => [category.slug, category.name] as const,
  ),
);

const AVAILABILITY_BY_STATUS: Record<string, ElectronicProductAvailability> = {
  "in stock": "in-stock",
  "low stock": "low-stock",
  "out of stock": "out-of-stock",
};

const LOW_STOCK_THRESHOLD = 10;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_SHORT_TEXT_LENGTH = 240;
const MAX_TAG_LENGTH = 60;

export function getElectronicProductCategoryName(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const knownName = CATEGORY_NAMES.get(normalized);

  if (knownName) {
    return knownName;
  }

  return (
    normalized
      .split(/[-_]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || normalized
  );
}

export function slugifyProductTitle(value: string) {
  return sanitizeText(value, { maxLength: MAX_TITLE_LENGTH })
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return roundMoney(Math.min(Math.max(value, 0), 5));
}

function normalizeImages(urls: Array<string | undefined>) {
  const validUrls = urls
    .map((url) => sanitizeHttpUrl(url))
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(validUrls));
}

function normalizeTags(tags: string[]) {
  const validTags = tags
    .map((tag) =>
      sanitizeText(tag, { maxLength: MAX_TAG_LENGTH }).toLowerCase(),
    )
    .filter(Boolean);

  return Array.from(new Set(validTags));
}

function resolveAvailability(
  status: string | undefined,
  quantity: number,
): ElectronicProductAvailability {
  if (quantity <= 0) {
    return "out-of-stock";
  }

  const normalizedStatus = status
    ? sanitizeText(status, { maxLength: MAX_TAG_LENGTH }).toLowerCase()
    : "";
  const knownStatus = AVAILABILITY_BY_STATUS[normalizedStatus];

  if (knownStatus && knownStatus !== "out-of-stock") {
    return knownStatus;
  }

  return quantity <= LOW_STOCK_THRESHOLD ? "low-stock" : "in-stock";
}

function buildSpecs(dto: DummyJsonProduct) {
  const minimumOrderQuantity = dto.minimumOrderQuantity
    ? Math.trunc(dto.minimumOrderQuantity)
    : 0;

  const specs: ElectronicProductSpec[] = [
    { label: "Marca", value: sanitizeText(dto.brand, { maxLength: 120 }) },
    { label: "SKU", value: sanitizeText(dto.sku, { maxLength: 120 }) },
    {
      label: "Código de barras",
      value: sanitizeText(dto.meta?.barcode, { maxLength: 120 }),
    },
    {
      label: "Pedido mínimo",
      value: minimumOrderQuantity > 1 ? String(minimumOrderQuantity) : "",
    },
    {
      label: "Garantia",
      value: sanitizeText(dto.warrantyInformation, {
        maxLength: MAX_SHORT_TEXT_LENGTH,
      }),
    },
    {
      label: "Envio",
      value: sanitizeText(dto.shippingInformation, {
        maxLength: MAX_SHORT_TEXT_LENGTH,
      }),
    },
    {
      label: "Devolução",
      value: sanitizeText(dto.returnPolicy, {
        maxLength: MAX_SHORT_TEXT_LENGTH,
      }),
    },
  ];

  return specs.filter((spec) => spec.value.length > 0);
}

export function mapExternalProduct(dto: DummyJsonProduct): ElectronicProduct {
  const title = sanitizeText(dto.title, { maxLength: MAX_TITLE_LENGTH });
  const basePrice = roundMoney(Math.max(dto.price, 0));
  const discountPercent = clampPercent(dto.discountPercentage);
  const discount = roundMoney((basePrice * discountPercent) / 100);
  const finalPrice = roundMoney(Math.max(basePrice - discount, 0));
  const quantity = Math.max(Math.trunc(dto.stock), 0);
  const images = normalizeImages([...dto.images, dto.thumbnail]);
  const categorySlug = sanitizeExternalId(dto.category) || "eletronicos";

  return {
    id: String(dto.id),
    slug: slugifyProductTitle(title) || `produto-${dto.id}`,
    sku: sanitizeText(dto.sku, { maxLength: 120 }) || `EXT-${dto.id}`,
    title: title || `Produto ${dto.id}`,
    brand: sanitizeText(dto.brand, { maxLength: 120 }),
    category: {
      slug: categorySlug,
      name: getElectronicProductCategoryName(categorySlug),
    },
    price: {
      base: basePrice,
      final: finalPrice,
      discount,
      discountPercent:
        basePrice > 0 ? roundMoney((discount / basePrice) * 100) : 0,
    },
    stock: {
      quantity,
      available: quantity > 0,
      availability: resolveAvailability(dto.availabilityStatus, quantity),
    },
    thumbnail: images[0] ?? "",
    images,
    description: sanitizeText(dto.description, {
      maxLength: MAX_DESCRIPTION_LENGTH,
    }),
    specs: buildSpecs(dto),
    rating: clampRating(dto.rating),
    reviews: dto.reviews.length,
    warranty: sanitizeOptionalText(dto.warrantyInformation, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }),
    shipping: sanitizeOptionalText(dto.shippingInformation, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }),
    returnPolicy: sanitizeOptionalText(dto.returnPolicy, {
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }),
    tags: normalizeTags(dto.tags),
    source: ELECTRONIC_PRODUCT_SOURCE,
  };
}

export function mapExternalProducts(dtos: DummyJsonProduct[]) {
  return dtos.map(mapExternalProduct);
}
