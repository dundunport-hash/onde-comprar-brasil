import { describe, expect, it } from "vitest";
import type { DummyJsonProduct } from "@/lib/dummyjson";
import {
  ELECTRONIC_PRODUCT_CATEGORIES,
  getElectronicProductCategoryName,
  mapExternalProduct,
  mapExternalProducts,
  slugifyProductTitle,
} from "./product-adapter";

const IMAGE_URL =
  "https://cdn.dummyjson.com/products/images/smartphones/iPhone%209/1.png";
const THUMBNAIL_URL =
  "https://cdn.dummyjson.com/products/images/smartphones/iPhone%209/thumbnail.png";

function createExternalProduct(
  overrides: Partial<DummyJsonProduct> = {},
): DummyJsonProduct {
  return {
    id: 1,
    title: "iPhone 9",
    description: "An apple mobile which is nothing like apple",
    category: "smartphones",
    price: 549,
    discountPercentage: 12.96,
    rating: 4.69,
    stock: 94,
    tags: ["smartphones", "apple"],
    brand: "Apple",
    sku: "SMS-IPH-9",
    warrantyInformation: "1 month warranty",
    shippingInformation: "Ships in 1 month",
    availabilityStatus: "Low Stock",
    reviews: [
      {
        rating: 5,
        comment: "ok",
        reviewerName: "Ana",
        reviewerEmail: "ana@example.com",
      },
    ],
    returnPolicy: "30 days return policy",
    minimumOrderQuantity: 1,
    meta: {
      createdAt: "2024-05-23T08:56:21.618Z",
      updatedAt: "2024-05-23T08:56:21.618Z",
      barcode: "1234567890",
      qrCode: "https://cdn.dummyjson.com/qr.png",
    },
    images: [IMAGE_URL],
    thumbnail: THUMBNAIL_URL,
    ...overrides,
  };
}

describe("product adapter", () => {
  it("maps the external DTO to the internal electronic product type", () => {
    const product = mapExternalProduct(createExternalProduct());

    expect(product).toEqual({
      id: "1",
      slug: "iphone-9",
      sku: "SMS-IPH-9",
      title: "iPhone 9",
      brand: "Apple",
      category: { slug: "smartphones", name: "Smartphones" },
      price: {
        base: 549,
        final: 477.85,
        discount: 71.15,
        discountPercent: 12.96,
      },
      stock: { quantity: 94, available: true, availability: "low-stock" },
      thumbnail: IMAGE_URL,
      images: [IMAGE_URL, THUMBNAIL_URL],
      description: "An apple mobile which is nothing like apple",
      specs: [
        { label: "Marca", value: "Apple" },
        { label: "SKU", value: "SMS-IPH-9" },
        { label: "Código de barras", value: "1234567890" },
        { label: "Garantia", value: "1 month warranty" },
        { label: "Envio", value: "Ships in 1 month" },
        { label: "Devolução", value: "30 days return policy" },
      ],
      rating: 4.69,
      reviews: 1,
      warranty: "1 month warranty",
      shipping: "Ships in 1 month",
      returnPolicy: "30 days return policy",
      tags: ["smartphones", "apple"],
      source: "dummyjson",
    });
  });

  it("does not expose external DTO field names or PII", () => {
    const product = mapExternalProduct(createExternalProduct());

    expect(Object.keys(product).sort()).toEqual(
      [
        "brand",
        "category",
        "description",
        "id",
        "images",
        "price",
        "rating",
        "returnPolicy",
        "reviews",
        "shipping",
        "sku",
        "slug",
        "source",
        "specs",
        "stock",
        "tags",
        "thumbnail",
        "title",
        "warranty",
      ].sort(),
    );
    expect(product).not.toHaveProperty("discountPercentage");
    expect(product).not.toHaveProperty("availabilityStatus");
    expect(product).not.toHaveProperty("warrantyInformation");
    expect(JSON.stringify(product)).not.toContain("reviewerEmail");
  });

  it("uses stock as the authoritative source for availability", () => {
    const zeroStock = mapExternalProduct(
      createExternalProduct({ availabilityStatus: "In Stock", stock: 0 }),
    );
    const unknownStatus = mapExternalProduct(
      createExternalProduct({
        availabilityStatus: "Embalagem danificada",
        stock: 4,
      }),
    );
    const healthyStock = mapExternalProduct(
      createExternalProduct({ availabilityStatus: undefined, stock: 40 }),
    );

    expect(zeroStock.stock).toEqual({
      quantity: 0,
      available: false,
      availability: "out-of-stock",
    });
    expect(unknownStatus.stock).toEqual({
      quantity: 4,
      available: true,
      availability: "low-stock",
    });
    expect(healthyStock.stock).toEqual({
      quantity: 40,
      available: true,
      availability: "in-stock",
    });
  });

  it("clamps discount, rating and stock to safe ranges", () => {
    const product = mapExternalProduct(
      createExternalProduct({
        price: 100,
        discountPercentage: 150,
        rating: 9.5,
        stock: -3,
      }),
    );

    expect(product.price).toEqual({
      base: 100,
      final: 0,
      discount: 100,
      discountPercent: 100,
    });
    expect(product.rating).toBe(5);
    expect(product.stock.quantity).toBe(0);
    expect(product.stock.available).toBe(false);
    expect(product.stock.availability).toBe("out-of-stock");
  });

  it("omits empty specs and falls back for missing sku and text fields", () => {
    const product = mapExternalProduct(
      createExternalProduct({
        brand: undefined,
        sku: "   ",
        meta: undefined,
        minimumOrderQuantity: 3,
        warrantyInformation: undefined,
        shippingInformation: undefined,
        returnPolicy: undefined,
      }),
    );

    expect(product.specs).toEqual([{ label: "Pedido mínimo", value: "3" }]);
    expect(product.brand).toBe("");
    expect(product.sku).toBe("EXT-1");
    expect(product.warranty).toBeNull();
    expect(product.shipping).toBeNull();
    expect(product.returnPolicy).toBeNull();
  });

  it("sanitizes untrusted text, images and slugs", () => {
    const product = mapExternalProduct(
      createExternalProduct({
        title: "<script>alert(1)</script>###",
        category: "mens-watches",
        images: ["javascript:alert(1)", IMAGE_URL, IMAGE_URL],
        thumbnail: undefined,
      }),
    );

    expect(product.title).toBe("###");
    expect(product.slug).toBe("produto-1");
    expect(product.images).toEqual([IMAGE_URL]);
    expect(product.thumbnail).toBe(IMAGE_URL);
    expect(product.category).toEqual({
      slug: "mens-watches",
      name: "Mens Watches",
    });
  });

  it("exposes electronic categories, category names and list mapping", () => {
    expect(
      ELECTRONIC_PRODUCT_CATEGORIES.map((category) => category.slug),
    ).toEqual(["smartphones", "laptops", "tablets", "mobile-accessories"]);
    expect(getElectronicProductCategoryName("laptops")).toBe("Notebooks");
    expect(getElectronicProductCategoryName("  Laptops ")).toBe("Notebooks");
    expect(slugifyProductTitle("Câmera Ação Pro")).toBe("camera-acao-pro");

    const products = mapExternalProducts([
      createExternalProduct({ id: 7, title: "Notebook X" }),
      createExternalProduct({ id: 8, title: "Tablet Y" }),
    ]);

    expect(products.map((product) => product.id)).toEqual(["7", "8"]);
    expect(products.map((product) => product.slug)).toEqual([
      "notebook-x",
      "tablet-y",
    ]);
  });
});
