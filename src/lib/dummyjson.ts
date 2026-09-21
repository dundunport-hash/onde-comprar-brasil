import { z } from "zod";
import { env } from "@/lib/env";

/**
 * Cliente da API externa DummyJSON (prototipo de catalogo de eletronicos).
 *
 * Este modulo conhece apenas o contrato externo (DTO). Ele nao e importado por
 * componentes: a UI consome o tipo de dominio gerado por `@/lib/product-adapter`
 * atraves de `@/lib/electronic-products`.
 */
const DEFAULT_API_URL = "https://dummyjson.com";
const PRODUCTS_PATH = "/products";
const CACHE_REVALIDATE_SECONDS = 5 * 60;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;

/**
 * `reviews` traz nome e e-mail de quem avaliou (PII da API externa). O DTO so
 * guarda a lista bruta para contagem, sem propagar esses dados para o dominio.
 */
const dummyJsonProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  price: z.number().nonnegative(),
  discountPercentage: z.number().nonnegative().optional().default(0),
  rating: z.number().nonnegative().optional().default(0),
  stock: z.number().int().nonnegative().optional().default(0),
  tags: z.array(z.string()).optional().default([]),
  brand: z.string().optional(),
  sku: z.string().optional(),
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  availabilityStatus: z.string().optional(),
  reviews: z.array(z.unknown()).optional().default([]),
  returnPolicy: z.string().optional(),
  minimumOrderQuantity: z.number().optional(),
  meta: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      barcode: z.string().optional(),
      qrCode: z.string().optional(),
    })
    .optional(),
  images: z.array(z.string()).optional().default([]),
  thumbnail: z.string().optional(),
});

const dummyJsonProductsResponseSchema = z.object({
  products: z.array(dummyJsonProductSchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
});

export type DummyJsonProduct = z.infer<typeof dummyJsonProductSchema>;
export type DummyJsonProductsResponse = z.infer<
  typeof dummyJsonProductsResponseSchema
>;

export type DummyJsonProductsQuery = {
  query?: string;
  category?: string;
  limit?: number;
  skip?: number;
};

export class DummyJsonRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DummyJsonRequestError";
    this.status = status;
  }
}

function getApiUrl() {
  return (env.DUMMYJSON_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

function normalizeLimit(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_LIMIT);
}

function normalizeSkip(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(Math.trunc(value), 0);
}

function buildDummyJsonUrl(
  path: string,
  params: Record<string, string | number | undefined> = {},
) {
  const url = new URL(`${getApiUrl()}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function requestDummyJson<Schema extends z.ZodType>(
  url: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
    });
  } catch {
    throw new DummyJsonRequestError(
      "Nao foi possivel consultar a API externa de produtos.",
      503,
    );
  }

  if (!response.ok) {
    throw new DummyJsonRequestError(
      "API externa de produtos indisponivel.",
      response.status,
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new DummyJsonRequestError(
      "Resposta invalida da API externa de produtos.",
      502,
    );
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new DummyJsonRequestError(
      "Resposta inesperada da API externa de produtos.",
      502,
    );
  }

  return parsed.data;
}

export async function fetchDummyJsonProducts(
  query: DummyJsonProductsQuery = {},
): Promise<DummyJsonProductsResponse> {
  const search = query.query?.trim();
  const category = query.category?.trim();

  const path = search
    ? `${PRODUCTS_PATH}/search`
    : category
      ? `${PRODUCTS_PATH}/category/${encodeURIComponent(category)}`
      : PRODUCTS_PATH;

  return requestDummyJson(
    buildDummyJsonUrl(path, {
      limit: normalizeLimit(query.limit),
      skip: normalizeSkip(query.skip),
      ...(search ? { q: search } : {}),
    }),
    dummyJsonProductsResponseSchema,
  );
}

export async function fetchDummyJsonProduct(
  id: number,
): Promise<DummyJsonProduct | null> {
  try {
    return await requestDummyJson(
      buildDummyJsonUrl(`${PRODUCTS_PATH}/${id}`),
      dummyJsonProductSchema,
    );
  } catch (error) {
    if (error instanceof DummyJsonRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
