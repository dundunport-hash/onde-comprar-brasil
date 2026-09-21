import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartModalContent } from "./CartModalContent";
import type { PersistedCart } from "@/lib/cart";
import { currencyFormatter } from "@/lib/currencyFormatter";
import {
  clearCart,
  removeCartItem,
  updateCartItem,
} from "@/app/carrinho/actions";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/app/carrinho/actions", () => ({
  clearCart: vi.fn(),
  removeCartItem: vi.fn(),
  updateCartItem: vi.fn(),
}));
vi.mock("@/app/checkout/pagamento/actions", () => ({
  createMercadoPagoPixPayment: vi.fn(),
  createStripeCheckoutSession: vi.fn(),
}));
vi.mock("./ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock("@/app/carrinho/LazyShippingCalculatorCard", () => ({
  LazyShippingCalculatorCard: () => <p>Calculadora de frete</p>,
}));
vi.mock("@/app/carrinho/PrescriptionUploadCard", () => ({
  PrescriptionUploadCard: () => <p>Upload legado</p>,
}));

function makeCart() {
  // Only fields consumed by this view and the real summary/stock helpers.
  return {
    shippingMethod: "pickup",
    shippingLabel: "Retirada na loja",
    shippingPrice: 0,
    shippingEstimatedDays: null,
    shippingPostalCode: null,
    shippingCalculatedAt: null,
    prescriptionImageUrl: null,
    items: [
      {
        id: "item-1",
        quantity: 1,
        unitPrice: 90,
        baseUnitPrice: 100,
        couponCode: "TECH10",
        couponDiscountPercent: 10,
        couponDiscountAmount: 10,
        product: {
          id: "p1",
          name: "Fone Bluetooth",
          slug: "fone-bluetooth",
          price: 100,
          stock: 2,
          active: true,
          imageUrl: null,
          imageUrl2: null,
          imageUrl3: null,
          category: { name: "Áudio", slug: "audio" },
        },
      },
    ],
  } as unknown as PersistedCart;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CartModalContent", () => {
  it("shows an empty cart with a catalog destination", () => {
    render(<CartModalContent cart={null} />);
    expect(
      screen.getByRole("heading", { name: "Seu carrinho está vazio" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explorar produtos" }),
    ).toHaveAttribute("href", "/#catalogo");
    expect(
      screen.queryByRole("button", { name: "Pix" }),
    ).not.toBeInTheDocument();
  });

  it("puts products before the summary and preserves coupon totals and login", () => {
    render(<CartModalContent cart={makeCart()} />);
    const items = screen.getByRole("region", { name: /Seus produtos/ });
    const summary = screen.getByRole("complementary", {
      name: "Entrega e resumo da compra",
    });
    expect(
      items.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Fone Bluetooth" }),
    ).toHaveAttribute("href", "/product/fone-bluetooth");
    expect(screen.getByText(/Cupom TECH10/)).toBeInTheDocument();
    expect(screen.getByText("Total").parentElement).toHaveTextContent(
      currencyFormatter.format(90).replace(/\s/g, " "),
    );
    expect(screen.getByRole("link", { name: /Fazer login/ })).toHaveAttribute(
      "href",
      "/login?callbackUrl=/checkout/pagamento",
    );
  });

  it("keeps quantity, remove and clear actions and their payloads", async () => {
    render(<CartModalContent cart={makeCart()} />);
    expect(
      screen.getByRole("button", { name: /Diminuir quantidade/ }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: /Aumentar quantidade/ }),
    );
    await waitFor(() => expect(updateCartItem).toHaveBeenCalledTimes(1));
    expect(
      Object.fromEntries(vi.mocked(updateCartItem).mock.calls[0][0]),
    ).toEqual({ cartItemId: "item-1", quantity: "2" });
    fireEvent.click(screen.getByRole("button", { name: /Remover/ }));
    await waitFor(() => expect(removeCartItem).toHaveBeenCalledTimes(1));
    expect(
      Object.fromEntries(vi.mocked(removeCartItem).mock.calls[0][0]),
    ).toEqual({ cartItemId: "item-1" });
    fireEvent.click(screen.getByRole("button", { name: "Limpar carrinho" }));
    await waitFor(() => expect(clearCart).toHaveBeenCalledTimes(1));
  });

  it("disables increment at the stock limit and permits authenticated payment", () => {
    const cart = makeCart();
    cart.items[0].quantity = 2;
    render(<CartModalContent cart={cart} isAuthenticated />);
    expect(
      screen.getByRole("button", { name: /Aumentar quantidade/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Pix" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Cartão de crédito" }),
    ).toBeEnabled();
  });

  it.each(["inactive", "stock", "shipping", "legacy"])(
    "keeps checkout blocked for %s",
    (reason) => {
      const cart = makeCart();
      if (reason === "inactive") cart.items[0].product.active = false;
      if (reason === "stock") cart.items[0].product.stock = 0;
      if (reason === "shipping") {
        cart.shippingMethod = null;
        cart.shippingLabel = null;
        cart.shippingPrice = null;
      }
      if (reason === "legacy")
        cart.items[0].product.category = {
          name: "Medicamentos controlados",
          slug: "medicamentos-controlados",
        };
      render(<CartModalContent cart={cart} isAuthenticated />);
      expect(
        screen.queryByRole("button", { name: "Pix" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Revise os avisos/)).toBeInTheDocument();
    },
  );
});
