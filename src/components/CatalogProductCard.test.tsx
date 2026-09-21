import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CatalogProductCard,
  type CatalogCardProduct,
} from "./CatalogProductCard";

vi.mock("@/app/carrinho/actions", () => ({ addCartItem: vi.fn() }));
vi.mock("./ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
afterEach(cleanup);

const product: CatalogCardProduct = {
  id: "fone-1",
  slug: "fone",
  name: "Fone Bluetooth",
  price: 100,
  active: true,
  stock: 2,
  imageUrl: null,
  category: { name: "Áudio", slug: "audio" },
  promotions: [],
  coupons: [],
};

describe("CatalogProductCard", () => {
  it("keeps the product link separate from the cart action and preserves its payload", () => {
    const { container } = render(<CatalogProductCard product={product} />);
    const link = screen.getByRole("link", {
      name: "Ver detalhes de Fone Bluetooth",
    });
    expect(link).toHaveAttribute("href", "/product/fone");
    const button = screen.getByRole("button", {
      name: "Adicionar Fone Bluetooth ao carrinho",
    });
    expect(button).toBeEnabled();
    expect(link).not.toContainElement(button);
    expect(
      Object.fromEntries(new FormData(container.querySelector("form")!)),
    ).toEqual({ productId: "fone-1", quantity: "1" });
    expect(screen.getByText("Sem imagem")).toBeInTheDocument();
  });

  it.each([
    { active: false, stock: 2 },
    { active: true, stock: 0 },
  ])("disables unavailable products: %o", (availability) => {
    render(<CatalogProductCard product={{ ...product, ...availability }} />);
    expect(
      screen.getByRole("button", { name: "Fone Bluetooth indisponível" }),
    ).toBeDisabled();
  });

  it("shows a real discount and keeps coupon entry inside expandable details", () => {
    render(
      <CatalogProductCard
        product={{
          ...product,
          promotions: [
            {
              id: "promo",
              name: "Oferta",
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
                code: "AUDIO",
                discountPercent: 5,
                active: true,
              },
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("−20%")).toBeInTheDocument();
    expect(screen.getByText(/80,00/)).toBeInTheDocument();
    const input = screen.getByLabelText("Cupom do produto");
    expect(input).toHaveAttribute("name", "couponCode");
    expect(input.closest("details")).not.toHaveAttribute("open");
  });
});
