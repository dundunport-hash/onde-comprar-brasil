import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/dummyjson", () => ({
  fetchDummyJsonProducts: vi.fn(),
  fetchDummyJsonProduct: vi.fn(),
}));

import { fetchDummyJsonProduct, fetchDummyJsonProducts } from "@/lib/dummyjson";
import {
  getElectronicProductById,
  getElectronicProducts,
} from "./electronic-products";

const mockedFetchProducts = vi.mocked(fetchDummyJsonProducts);
const mockedFetchProduct = vi.mocked(fetchDummyJsonProduct);

const IMAGE_URL =
  "https://cdn.dummyjson.com/products/images/smartphones/Samsung%20Universe%209/1.png";

function createProductPayload() {
  return {
    id: 3,
    title: "Samsung Universe 9",
    description: "Samsung's new variant",
    category: "smartphones",
    price: 1249,
    discountPercentage: 9.5,
    rating: 4.09,
    stock: 3,
    tags: ["smartphones"],
    brand: "Samsung",
    sku: "SMS-SAM-9",
    availabilityStatus: "Low Stock",
    reviews: [],
    images: [IMAGE_URL],
    thumbnail: IMAGE_URL,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("electronic products service", () => {
  it("returns mapped domain products and echoes pagination", async () => {
    mockedFetchProducts.mockResolvedValue({
      products: [createProductPayload()],
      total: 42,
      skip: 12,
      limit: 12,
    });

    const page = await getElectronicProducts({
      category: "smartphones",
      limit: 12,
      skip: 12,
    });

    expect(mockedFetchProducts).toHaveBeenCalledWith({
      query: undefined,
      category: "smartphones",
      limit: 12,
      skip: 12,
    });
    expect(page.total).toBe(42);
    expect(page.skip).toBe(12);
    expect(page.limit).toBe(12);
    expect(page.products[0]).toMatchObject({
      id: "3",
      slug: "samsung-universe-9",
      title: "Samsung Universe 9",
      source: "dummyjson",
    });
    expect(page.products[0]).not.toHaveProperty("discountPercentage");
  });

  it("sanitizes untrusted query and category input before calling the client", async () => {
    mockedFetchProducts.mockResolvedValue({
      products: [],
      total: 0,
      skip: 0,
      limit: 12,
    });

    await getElectronicProducts({
      query: "  <b>iphone</b>  ",
      category: "../../etc/passwd",
    });

    expect(mockedFetchProducts).toHaveBeenCalledWith({
      query: "iphone",
      category: undefined,
      limit: undefined,
      skip: undefined,
    });
  });

  it("rejects invalid ids without hitting the external client", async () => {
    expect(await getElectronicProductById(0)).toBeNull();
    expect(await getElectronicProductById("abc")).toBeNull();
    expect(mockedFetchProduct).not.toHaveBeenCalled();
  });

  it("returns null when the external product does not exist", async () => {
    mockedFetchProduct.mockResolvedValue(null);

    expect(await getElectronicProductById("99")).toBeNull();
    expect(mockedFetchProduct).toHaveBeenCalledWith(99);
  });

  it("maps a single external product to the domain type", async () => {
    mockedFetchProduct.mockResolvedValue(createProductPayload());

    const product = await getElectronicProductById(3);

    expect(product).toMatchObject({
      id: "3",
      sku: "SMS-SAM-9",
      category: { slug: "smartphones", name: "Smartphones" },
    });
    expect(product?.stock).toEqual({
      quantity: 3,
      available: true,
      availability: "low-stock",
    });
    expect(product?.price).toEqual({
      base: 1249,
      final: 1130.34,
      discount: 118.66,
      discountPercent: 9.5,
    });
  });
});
