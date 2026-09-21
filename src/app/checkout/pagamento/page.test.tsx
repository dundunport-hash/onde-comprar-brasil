import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { getCart, type PersistedCart } from "@/lib/cart";
import CheckoutPaymentPage from "./page";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/cart", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cart")>()),
  getCart: vi.fn(),
}));
vi.mock("./actions", () => ({
  createMercadoPagoPixPayment: vi.fn(),
  createStripeCheckoutSession: vi.fn(),
}));

function makeCart() {
  // Fixture limited to fields read by the view and the real calculation helpers.
  return {
    shippingMethod: "pickup",
    shippingLabel: "Retirada na loja",
    shippingPrice: 0,
    prescriptionImageUrl: null,
    items: [
      {
        id: "item-1",
        quantity: 2,
        unitPrice: 90,
        baseUnitPrice: 100,
        product: {
          id: "p1",
          name: "Fone Bluetooth",
          price: 100,
          stock: 3,
          active: true,
          category: { name: "Áudio", slug: "audio" },
        },
      },
    ],
  } as unknown as PersistedCart;
}

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
  vi.mocked(getCart).mockResolvedValue(makeCart());
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage() {
  render(await CheckoutPaymentPage({ searchParams: Promise.resolve({}) }));
}

describe("Checkout payment presentation", () => {
  it("shows products, quantities and unchanged totals with both payment forms", async () => {
    await renderPage();
    const items = screen.getByRole("list", { name: "Produtos da compra" });
    expect(within(items).getByText("Fone Bluetooth")).toBeInTheDocument();
    expect(within(items).getByText("2 un.")).toBeInTheDocument();
    expect(screen.getByText("Total").parentElement).toHaveTextContent(
      "R$ 180,00",
    );
    expect(
      screen.getByRole("button", { name: "Pagar com Pix" }),
    ).toHaveAttribute("type", "submit");
    expect(
      screen.getByRole("button", { name: "Pagar com Cartão" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: /Voltar à loja/ })).toHaveAttribute(
      "href",
      "/#catalogo",
    );
    expect(
      screen.getByRole("link", { name: /Precisa de ajuda/ }),
    ).toHaveAttribute("href", "/contato");
  });

  it.each(["stock", "shipping", "prescription"])(
    "preserves the %s payment block",
    async (reason) => {
      const cart = makeCart();
      if (reason === "stock") cart.items[0].product.stock = 0;
      if (reason === "shipping") {
        cart.shippingMethod = null;
        cart.shippingLabel = null;
      }
      if (reason === "prescription")
        cart.items[0].product.category = {
          name: "Medicamentos controlados",
          slug: "medicamentos-controlados",
        };
      vi.mocked(getCart).mockResolvedValue(cart);
      await renderPage();
      expect(
        screen.queryByRole("button", { name: "Pagar com Pix" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Pagar com Cartão" }),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps authentication required for payment", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    await renderPage();
    expect(screen.getByRole("link", { name: /Fazer login/ })).toHaveAttribute(
      "href",
      "/login?callbackUrl=/checkout/pagamento",
    );
    expect(
      screen.queryByRole("button", { name: "Pagar com Pix" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose payment forms for an empty cart", async () => {
    vi.mocked(getCart).mockResolvedValue(null);
    await renderPage();
    expect(screen.getByRole("link", { name: "Ver produtos" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("button", { name: "Pagar com Pix" }),
    ).not.toBeInTheDocument();
  });
});
