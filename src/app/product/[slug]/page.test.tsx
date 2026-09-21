import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductPage, { generateMetadata } from "./page";
import {
  getCachedProductBySlug,
  getCachedProductMetadataBySlug,
  type ProductDetail,
} from "@/lib/catalog-cache";

vi.mock("@/lib/catalog-cache", () => ({
  getCachedProductBySlug: vi.fn(),
  getCachedProductMetadataBySlug: vi.fn(),
}));
vi.mock("@/app/carrinho/actions", () => ({ addCartItem: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const product: ProductDetail = {
  id: "p1",
  name: "Notebook",
  slug: "notebook",
  price: 100,
  active: true,
  stock: 2,
  description: "Tela de 15.6 polegadas. Para trabalhar.",
  technicalData: "Bluetooth 5.3\nPeso: 1.5 kg",
  imageUrl: null,
  imageUrl2: null,
  imageUrl3: null,
  ean: "123456789",
  lengthCm: 20,
  widthCm: 16,
  heightCm: 5,
  weightKg: 0.5,
  categoryId: "cat1",
  category: { name: "Notebooks", slug: "notebooks" },
  createdAt: new Date(),
  updatedAt: new Date(),
  stocks: [],
  promotions: [],
  coupons: [],
};
const params = Promise.resolve({ slug: "notebook" });
beforeEach(() => {
  vi.mocked(getCachedProductBySlug).mockResolvedValue(product);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProductPage", () => {
  it("keeps the cart payload, technical decimals and contact link", async () => {
    const { container } = render(await ProductPage({ params }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Notebook" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bluetooth 5.3")).toBeInTheDocument();
    expect(screen.getByText("Peso: 1.5 kg")).toBeInTheDocument();
    expect(screen.getByText(product.description!)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adicionar ao carrinho" }),
    ).toBeEnabled();
    expect(
      Object.fromEntries(new FormData(container.querySelector("form")!)),
    ).toEqual({ productId: "p1", quantity: "1" });
    expect(
      screen.getByRole("link", { name: "Tirar dúvidas com a loja" }),
    ).toHaveAttribute("href", "/contato");
    expect(
      screen.getByText(/não representam necessariamente/),
    ).toBeInTheDocument();
  });

  it.each([
    { active: false, stock: 2 },
    { active: true, stock: 0 },
  ])("disables unavailable products: %o", async (availability) => {
    vi.mocked(getCachedProductBySlug).mockResolvedValue({
      ...product,
      ...availability,
    });
    render(await ProductPage({ params }));
    expect(
      screen.getByRole("button", { name: "Produto indisponível" }),
    ).toBeDisabled();
    expect(screen.getByText("Indisponível no momento")).toBeInTheDocument();
  });

  it("shows real promotions and preserves coupon input", async () => {
    vi.mocked(getCachedProductBySlug).mockResolvedValue({
      ...product,
      promotions: [
        {
          id: "promo",
          name: "Oferta",
          description: null,
          active: true,
          discountPercent: 20,
          discountFixed: 0,
          startDate: new Date("2020-01-01"),
          endDate: new Date("2099-01-01"),
        },
      ],
      coupons: [
        {
          coupon: {
            id: "coupon",
            code: "TECH",
            discountPercent: 5,
            active: true,
          },
        },
      ],
    });
    render(await ProductPage({ params }));
    expect(screen.getByText("−20%")).toBeInTheDocument();
    expect(screen.getByText(/Você economiza/)).toHaveTextContent(/20,00/);
    expect(screen.getByLabelText("Cupom do produto")).toHaveAttribute(
      "name",
      "couponCode",
    );
    expect(
      screen.getByLabelText("Cupom do produto").closest("details"),
    ).not.toHaveAttribute("open");
  });

  it("handles absent descriptions without inventing specifications", async () => {
    vi.mocked(getCachedProductBySlug).mockResolvedValue({
      ...product,
      description: null,
      technicalData: null,
    });
    render(await ProductPage({ params }));
    expect(
      screen.getByText(/Descrição ainda não informada/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Especificações ainda não informadas/),
    ).toBeInTheDocument();
  });

  it("preserves not-found and metadata behavior", async () => {
    vi.mocked(getCachedProductBySlug).mockResolvedValue(null);
    await expect(ProductPage({ params })).rejects.toThrow("NOT_FOUND");
    vi.mocked(getCachedProductMetadataBySlug).mockResolvedValue({
      name: "Notebook",
      description: "Descrição",
      imageUrl: "https://cdn.dummyjson.com/product.png",
    });
    expect(await generateMetadata({ params })).toMatchObject({
      title: expect.stringContaining("Notebook"),
      description: "Descrição",
      alternates: {
        canonical: "/product/notebook",
      },
    });
  });
});
