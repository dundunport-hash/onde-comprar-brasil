import {
  fetchDummyJsonProduct,
  fetchDummyJsonProducts,
  type DummyJsonProductsQuery,
} from "@/lib/dummyjson";
import {
  mapExternalProduct,
  mapExternalProducts,
  type ElectronicProduct,
} from "@/lib/product-adapter";
import { sanitizeExternalId, sanitizeText } from "@/lib/sanitize";

/**
 * Unico ponto de entrada da UI para o catalogo externo de eletronicos.
 *
 * Recebe entrada nao confiavel (query params), delega ao cliente DummyJSON e
 * devolve o tipo de dominio `ElectronicProduct` — nunca o DTO externo.
 */
export type ElectronicProductQuery = {
  query?: string;
  category?: string;
  limit?: number;
  skip?: number;
};

export type ElectronicProductPage = {
  products: ElectronicProduct[];
  total: number;
  limit: number;
  skip: number;
};

function normalizeQuery(query: ElectronicProductQuery): DummyJsonProductsQuery {
  return {
    query: query.query
      ? sanitizeText(query.query, { maxLength: 120 }) || undefined
      : undefined,
    category: query.category
      ? sanitizeExternalId(query.category) || undefined
      : undefined,
    limit: query.limit,
    skip: query.skip,
  };
}

export async function getElectronicProducts(
  query: ElectronicProductQuery = {},
): Promise<ElectronicProductPage> {
  const response = await fetchDummyJsonProducts(normalizeQuery(query));

  return {
    products: mapExternalProducts(response.products),
    total: response.total,
    limit: response.limit,
    skip: response.skip,
  };
}

export async function getElectronicProductById(
  id: number | string,
): Promise<ElectronicProduct | null> {
  const numericId = typeof id === "string" ? Number(id) : id;

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const product = await fetchDummyJsonProduct(numericId);

  return product ? mapExternalProduct(product) : null;
}
