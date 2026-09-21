import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DummyJsonRequestError,
  fetchDummyJsonProduct,
  fetchDummyJsonProducts,
} from "./dummyjson";

const fetchMock = vi.fn();

function createResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function createProductPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "iPhone 9",
    description: "An apple mobile",
    category: "smartphones",
    price: 549,
    discountPercentage: 12.96,
    rating: 4.69,
    stock: 94,
    tags: ["smartphones"],
    brand: "Apple",
    sku: "SMS-IPH-9",
    warrantyInformation: "1 month warranty",
    shippingInformation: "Ships in 1 month",
    availabilityStatus: "Low Stock",
    reviews: [{ reviewerEmail: "ana@example.com" }],
    returnPolicy: "30 days return policy",
    minimumOrderQuantity: 1,
    meta: { barcode: "1234567890" },
    images: ["https://cdn.dummyjson.com/a.png"],
    thumbnail: "https://cdn.dummyjson.com/thumbnail.png",
    ...overrides,
  };
}

function getLastFetchCall() {
  const call = fetchMock.mock.calls.at(-1);

  if (!call) {
    throw new Error("fetch nao foi chamado");
  }

  return {
    url: String(call[0]),
    init: call[1] as RequestInit,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dummyjson client", () => {
  it("builds the listing URL with pagination defaults and cache options", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ products: [], total: 0, skip: 0, limit: 12 }),
    );

    await fetchDummyJsonProducts();

    const { url, init } = getLastFetchCall();

    expect(url).toContain("/products?limit=12&skip=0");
    expect(init).toMatchObject({
      headers: { accept: "application/json" },
      next: { revalidate: 300 },
    });
  });

  it("clamps limit and skip to safe values", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ products: [], total: 0, skip: 0, limit: 12 }),
    );

    await fetchDummyJsonProducts({ limit: 999 });
    expect(getLastFetchCall().url).toContain("limit=30");

    await fetchDummyJsonProducts({ limit: 0 });
    expect(getLastFetchCall().url).toContain("limit=1");

    await fetchDummyJsonProducts({ skip: -4 });
    expect(getLastFetchCall().url).toContain("skip=0");
  });

  it("uses search and category paths", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ products: [], total: 0, skip: 0, limit: 12 }),
    );

    await fetchDummyJsonProducts({ query: "iphone", limit: 3, skip: 6 });
    expect(getLastFetchCall().url).toContain(
      "/products/search?limit=3&skip=6&q=iphone",
    );

    await fetchDummyJsonProducts({ category: "smartphones" });
    expect(getLastFetchCall().url).toContain(
      "/products/category/smartphones?limit=12&skip=0",
    );
  });

  it("validates the payload and strips unknown fields", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        products: [{ ...createProductPayload(), foo: "bar" }],
        total: 1,
        skip: 0,
        limit: 12,
      }),
    );

    const result = await fetchDummyJsonProducts();

    expect(result.total).toBe(1);
    expect(result.products[0]).toMatchObject({
      id: 1,
      title: "iPhone 9",
      discountPercentage: 12.96,
      availabilityStatus: "Low Stock",
    });
    expect(result.products[0]).not.toHaveProperty("foo");
  });

  it("rejects invalid payloads without leaking details", async () => {
    fetchMock.mockResolvedValue(
      createResponse({
        products: [{ id: 1 }],
        total: 1,
        skip: 0,
        limit: 12,
      }),
    );

    await expect(fetchDummyJsonProducts()).rejects.toMatchObject({
      name: "DummyJsonRequestError",
      status: 502,
    });
  });

  it("maps HTTP errors and network failures to DummyJsonRequestError", async () => {
    fetchMock.mockResolvedValue(createResponse({ message: "boom" }, 500));

    await expect(fetchDummyJsonProducts()).rejects.toBeInstanceOf(
      DummyJsonRequestError,
    );
    await expect(fetchDummyJsonProducts()).rejects.toMatchObject({
      status: 500,
    });

    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(fetchDummyJsonProducts()).rejects.toMatchObject({
      status: 503,
    });
  });

  it("treats malformed JSON as a bad gateway", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);

    await expect(fetchDummyJsonProducts()).rejects.toMatchObject({
      status: 502,
    });
  });

  it("fetches a single product and returns null for 404", async () => {
    fetchMock.mockResolvedValue(createResponse(createProductPayload()));

    const product = await fetchDummyJsonProduct(1);

    expect(product).toMatchObject({ id: 1, title: "iPhone 9" });
    expect(getLastFetchCall().url).toContain("/products/1");

    fetchMock.mockResolvedValue(createResponse({ message: "not found" }, 404));

    expect(await fetchDummyJsonProduct(999)).toBeNull();
  });
});
