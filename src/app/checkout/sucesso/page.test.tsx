import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/checkout-fulfillment", () => ({
  fulfillPaidCart: vi.fn(),
}));

vi.mock("@/lib/mercado-pago-checkout", () => ({
  syncMercadoPagoPixPayment: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { SITE_NAME } from "@/lib/store-contact";
import { redirect } from "next/navigation";
import CheckoutSuccessPage from "./page";

const mockedFulfillPaidCart = vi.mocked(fulfillPaidCart);
const mockedSyncMercadoPagoPixPayment = vi.mocked(syncMercadoPagoPixPayment);
const mockedFindCart = prisma.cart.findFirst as unknown as Mock;
const mockedRetrieveSession = stripe.checkout.sessions
  .retrieve as unknown as Mock;
const mockedRedirect = vi.mocked(redirect);

const paidStripeSession = {
  id: "cs_1",
  amount_total: 5290,
  payment_status: "paid",
  payment_intent: "pi_1",
  created: 1_779_021_600,
  metadata: {
    cartId: "cart-1",
    userId: "user-1",
  },
};

const paidCart = {
  id: "cart-1",
  paymentStatus: "PAID",
  paidAt: new Date("2026-06-25T12:01:00.000Z"),
  updatedAt: new Date("2026-06-25T12:02:00.000Z"),
  shippingMethod: "standard",
  shippingLabel: "Entrega expressa",
  shippingPrice: 27.9,
  checkoutAddress: {
    fullName: "Maria Silva",
    document: "93541134780",
    street: "Praca da Se",
    number: "100",
    neighborhood: "Se",
    city: "Sao Paulo",
    state: "SP",
    postalCode: "01001000",
  },
  items: [
    {
      id: "item-1",
      quantity: 2,
      unitPrice: 12.5,
      product: {
        name: "Dipirona",
        slug: "dipirona",
      },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedRetrieveSession.mockResolvedValue(paidStripeSession);
  mockedFindCart.mockResolvedValue(paidCart);
  mockedSyncMercadoPagoPixPayment.mockResolvedValue({
    id: "mp_1",
    status: "approved",
    statusDetail: "accredited",
    externalReference: "cart-1",
    metadata: {
      cartId: "cart-1",
      userId: "user-1",
    },
    transactionAmount: 52.9,
    createdAt: "2026-06-25T12:00:00.000Z",
    approvedAt: "2026-06-25T12:01:00.000Z",
    pix: {
      qrCode: null,
      qrCodeBase64: null,
      ticketUrl: null,
    },
  });
});

async function renderSuccessPage(searchParams: Record<string, string> = {}) {
  render(
    await CheckoutSuccessPage({
      searchParams: Promise.resolve(searchParams),
    }),
  );
}

describe("CheckoutSuccessPage", () => {
  it("shows an empty state when there is no Stripe session id", async () => {
    await renderSuccessPage();

    expect(
      screen.getByRole("heading", { name: "Compra nao localizada" }),
    ).toBeInTheDocument();
    expect(mockedRetrieveSession).not.toHaveBeenCalled();
    expect(mockedFulfillPaidCart).not.toHaveBeenCalled();
  });

  it("rejects unsafe Stripe session id query values before lookup", async () => {
    await renderSuccessPage({ session_id: "cs_1&processed=1" });

    expect(
      screen.getByRole("heading", { name: "Compra nao localizada" }),
    ).toBeInTheDocument();
    expect(mockedRetrieveSession).not.toHaveBeenCalled();
    expect(mockedFulfillPaidCart).not.toHaveBeenCalled();
  });

  it("shows paid order details after the cart was cleared", async () => {
    await renderSuccessPage({ session_id: "cs_1", processed: "1" });

    expect(mockedRetrieveSession).toHaveBeenCalledWith("cs_1");
    expect(mockedFulfillPaidCart).toHaveBeenCalledWith({
      cartId: "cart-1",
      userId: "user-1",
      stripeCheckoutSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
    });
    expect(
      screen.getByRole("heading", { name: "Pedido confirmado" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pagamento aprovado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Recebemos sua compra. Seu pedido esta sendo processado para entrega no endereco informado.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Dipirona")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("CPF 93541134780")).toBeInTheDocument();
    expect(screen.getByText("R$ 52,90")).toBeInTheDocument();
  });

  it("redirects paid orders once after fulfillment so the active cart is cleared", async () => {
    await expect(renderSuccessPage({ session_id: "cs_1" })).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/sucesso?session_id=cs_1&processed=1",
    );

    expect(mockedRedirect).toHaveBeenCalledWith(
      "/checkout/sucesso?session_id=cs_1&processed=1",
    );
  });

  it("redirects paid orders without address to the address page", async () => {
    mockedFindCart.mockResolvedValueOnce({
      ...paidCart,
      checkoutAddress: null,
    });

    await expect(renderSuccessPage({ session_id: "cs_1" })).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/endereco?session_id=cs_1",
    );

    expect(mockedRedirect).toHaveBeenCalledWith(
      "/checkout/endereco?session_id=cs_1",
    );
  });

  it("redirects paid orders with address but without CPF to the address page", async () => {
    mockedFindCart.mockResolvedValueOnce({
      ...paidCart,
      checkoutAddress: {
        ...paidCart.checkoutAddress,
        document: null,
      },
    });

    await expect(renderSuccessPage({ session_id: "cs_1" })).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/endereco?session_id=cs_1",
    );

    expect(mockedRedirect).toHaveBeenCalledWith(
      "/checkout/endereco?session_id=cs_1",
    );
  });

  it("shows store pickup details for paid pickup orders without address", async () => {
    mockedFindCart.mockResolvedValueOnce({
      ...paidCart,
      shippingMethod: "pickup",
      shippingPrice: 0,
      checkoutAddress: null,
    });

    await renderSuccessPage({ session_id: "cs_1", processed: "1" });

    expect(mockedRedirect).not.toHaveBeenCalledWith(
      "/checkout/endereco?session_id=cs_1",
    );
    expect(
      screen.getByRole("heading", { name: "Retirada na loja" }),
    ).toBeInTheDocument();
    expect(screen.getByText(SITE_NAME)).toBeInTheDocument();
    expect(
      screen.getByText("R. Francisco Gomes de Souza, 08"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Fale conosco/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
    expect(
      screen.getByRole("link", { name: /Voltar para home/i }),
    ).toHaveAttribute("href", "/");
  });

  it("recognizes pickup orders by shipping label on the success page", async () => {
    mockedFindCart.mockResolvedValueOnce({
      ...paidCart,
      shippingMethod: null,
      shippingLabel: "Retirada na loja",
      shippingPrice: 0,
      checkoutAddress: null,
    });

    await renderSuccessPage({ session_id: "cs_1", processed: "1" });

    expect(
      screen.getByRole("heading", { name: "Retirada na loja" }),
    ).toBeInTheDocument();
    expect(screen.getByText(SITE_NAME)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Fale conosco/i }),
    ).toBeInTheDocument();
  });

  it("shows pending status without fulfilling unpaid sessions", async () => {
    mockedRetrieveSession.mockResolvedValueOnce({
      ...paidStripeSession,
      payment_status: "unpaid",
      amount_total: 5290,
    });

    await renderSuccessPage({ session_id: "cs_2" });

    expect(mockedFulfillPaidCart).not.toHaveBeenCalled();
    expect(screen.getByText("Pagamento em analise")).toBeInTheDocument();
  });

  it("shows Pix success from the local paid order when Mercado Pago lookup fails after processing", async () => {
    mockedSyncMercadoPagoPixPayment.mockRejectedValueOnce(
      new Error("Mercado Pago indisponivel."),
    );

    await renderSuccessPage({ mp_payment_id: "mp_1", processed: "1" });

    expect(mockedFindCart).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          mercadoPagoPaymentId: "mp_1",
        },
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Pedido confirmado" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pagamento aprovado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Recebemos sua compra. Seu pedido esta sendo processado para entrega no endereco informado.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Voltar para home/i }),
    ).toHaveAttribute("href", "/");
  });
});
