import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { CartStatus, PaymentStatus } from "@prisma/client";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/cart", () => ({
  cartHasControlledMedication: vi.fn(() => false),
  getCart: vi.fn(),
  getCartSummary: vi.fn(),
}));

vi.mock("@/lib/checkout-fulfillment", () => ({
  fulfillPaidCart: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
  toStripeAmount: (value: number) => Math.max(Math.round(value * 100), 0),
}));

vi.mock("@/lib/mercado-pago", () => ({
  createPixPayment: vi.fn(),
  toMercadoPagoAmount: (value: number) => Math.max(Number(value.toFixed(2)), 0),
}));

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import { getCart, getCartSummary } from "@/lib/cart";
import { createPixPayment } from "@/lib/mercado-pago";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  createMercadoPagoPixPayment,
  createStripeCheckoutSession,
} from "./actions";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedHeaders = vi.mocked(headers);
const mockedRedirect = vi.mocked(redirect);
const mockedGetCart = vi.mocked(getCart) as unknown as Mock;
const mockedGetCartSummary = vi.mocked(getCartSummary) as unknown as Mock;
const mockedCartUpdate = prisma.cart.update as unknown as Mock;
const mockedStripeCreate = stripe.checkout.sessions.create as unknown as Mock;
const mockedCreatePixPayment = vi.mocked(createPixPayment) as unknown as Mock;
const mockedFulfillPaidCart = vi.mocked(fulfillPaidCart) as unknown as Mock;

const updatedAt = new Date("2026-05-17T12:00:00.000Z");

function buildCart(overrides: Record<string, unknown> = {}) {
  return {
    id: "cart-1",
    updatedAt,
    shippingLabel: "Entrega expressa",
    shippingMethod: "express",
    shippingPostalCode: "01001000",
    shippingPrice: 27.9,
    items: [
      {
        id: "item-1",
        productId: "product-1",
        quantity: 2,
        unitPrice: 12.5,
        product: {
          id: "product-1",
          name: "Dipirona",
          stock: 5,
          active: true,
          price: 12.5,
          imageUrl: "https://example.com/dipirona.png",
          imageUrl2: null,
          imageUrl3: null,
          promotions: [],
        },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetServerSession.mockResolvedValue({
    user: {
      id: "user-1",
      email: "cliente@example.com",
    },
  });
  mockedHeaders.mockResolvedValue({
    get: (key: string) => (key === "origin" ? "http://localhost:3000" : null),
  } as Awaited<ReturnType<typeof headers>>);
  mockedGetCart.mockResolvedValue(buildCart());
  mockedGetCartSummary.mockReturnValue({
    quantity: 2,
    subtotal: 25,
    discountTotal: 0,
    shippingTotal: 27.9,
    total: 52.9,
  });
  mockedStripeCreate.mockResolvedValue({
    id: "cs_1",
    url: "https://checkout.stripe.com/c/pay/cs_1",
    payment_intent: "pi_1",
  });
  mockedCreatePixPayment.mockResolvedValue({
    id: "mp_1",
    status: "pending",
    statusDetail: "pending_waiting_payment",
    pix: {
      qrCode: "pix-code",
      qrCodeBase64: "base64",
      ticketUrl: "https://www.mercadopago.com.br/payments/mp_1",
    },
  });
});

describe("createStripeCheckoutSession", () => {
  it("redirects visitors to login before creating a payment session", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    await expect(createStripeCheckoutSession()).rejects.toThrow(
      "NEXT_REDIRECT:/login?callbackUrl=/checkout/pagamento",
    );

    expect(mockedRedirect).toHaveBeenCalledWith(
      "/login?callbackUrl=/checkout/pagamento",
    );
    expect(mockedGetCart).not.toHaveBeenCalled();
    expect(mockedStripeCreate).not.toHaveBeenCalled();
  });

  it("redirects to the cart when there is no active cart", async () => {
    mockedGetCart.mockResolvedValue(null);

    await expect(createStripeCheckoutSession()).rejects.toThrow(
      "NEXT_REDIRECT:/",
    );

    expect(mockedRedirect).toHaveBeenCalledWith("/");
    expect(mockedStripeCreate).not.toHaveBeenCalled();
  });

  it("creates a Stripe Checkout Session with cart items, shipping and idempotency key", async () => {
    await expect(createStripeCheckoutSession()).rejects.toThrow(
      "NEXT_REDIRECT:https://checkout.stripe.com/c/pay/cs_1",
    );

    expect(mockedStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        locale: "pt-BR",
        client_reference_id: "cart-1",
        customer_email: "cliente@example.com",
        success_url:
          "http://localhost:3000/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:3000/checkout/cancelado",
        metadata: {
          cartId: "cart-1",
          userId: "user-1",
          postalCode: "01001000",
          shippingMethod: "express",
        },
        line_items: [
          {
            quantity: 2,
            price_data: {
              currency: "brl",
              unit_amount: 1250,
              product_data: {
                name: "Dipirona",
                images: ["https://example.com/dipirona.png"],
              },
            },
          },
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: 2790,
              product_data: {
                name: "Frete - Entrega expressa",
                images: undefined,
              },
            },
          },
        ],
      }),
      {
        idempotencyKey: `checkout-session:cart-1:${updatedAt.getTime()}:5290`,
      },
    );
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: {
        stripeCheckoutSessionId: "cs_1",
        stripePaymentIntentId: "pi_1",
        paymentStatus: PaymentStatus.PENDING,
        status: CartStatus.ACTIVE,
      },
    });
    expect(mockedRedirect).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/pay/cs_1",
    );
  });

  it("creates a Stripe Checkout Session for pickup without a shipping line", async () => {
    mockedGetCart.mockResolvedValue(
      buildCart({
        shippingLabel: "Retirada na loja",
        shippingMethod: "pickup",
        shippingPostalCode: null,
        shippingPrice: 0,
      }),
    );
    mockedGetCartSummary.mockReturnValue({
      quantity: 2,
      subtotal: 25,
      discountTotal: 0,
      shippingTotal: 0,
      total: 25,
    });

    await expect(createStripeCheckoutSession()).rejects.toThrow(
      "NEXT_REDIRECT:https://checkout.stripe.com/c/pay/cs_1",
    );

    expect(mockedStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          cartId: "cart-1",
          userId: "user-1",
          postalCode: "",
          shippingMethod: "pickup",
        },
        line_items: [
          {
            quantity: 2,
            price_data: {
              currency: "brl",
              unit_amount: 1250,
              product_data: {
                name: "Dipirona",
                images: ["https://example.com/dipirona.png"],
              },
            },
          },
        ],
      }),
      {
        idempotencyKey: `checkout-session:cart-1:${updatedAt.getTime()}:2500`,
      },
    );
  });
});

describe("createMercadoPagoPixPayment", () => {
  it("creates a Pix payment without notificationUrl on localhost", async () => {
    await expect(createMercadoPagoPixPayment()).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/pix/mp_1",
    );

    expect(mockedCreatePixPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        cartId: "cart-1",
        userId: "user-1",
        payerEmail: "cliente@example.com",
        amount: 52.9,
        notificationUrl: undefined,
      }),
    );
    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: {
        mercadoPagoPaymentId: "mp_1",
        mercadoPagoStatus: "pending",
        mercadoPagoStatusDetail: "pending_waiting_payment",
        pixQrCode: "pix-code",
        pixQrCodeBase64: "base64",
        pixTicketUrl: "https://www.mercadopago.com.br/payments/mp_1",
        paymentStatus: PaymentStatus.PENDING,
        status: CartStatus.ACTIVE,
      },
    });
  });

  it("sends notificationUrl when the checkout origin is a public HTTPS URL", async () => {
    mockedHeaders.mockResolvedValue({
      get: (key: string) =>
        key === "origin" ? "https://loja.example.com" : null,
    } as Awaited<ReturnType<typeof headers>>);

    await expect(createMercadoPagoPixPayment()).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/pix/mp_1",
    );

    expect(mockedCreatePixPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationUrl: "https://loja.example.com/api/mercado-pago/webhook",
      }),
    );
  });

  it("redirects back to checkout with a friendly error when Mercado Pago is unavailable", async () => {
    mockedCreatePixPayment.mockRejectedValueOnce(
      new Error("Mercado Pago nao configurado."),
    );

    await expect(createMercadoPagoPixPayment()).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/pagamento?payment_error=mercadopago_unavailable",
    );

    expect(mockedCartUpdate).not.toHaveBeenCalled();
  });

  it("finalizes the cart and redirects to success when Pix is approved immediately", async () => {
    mockedCreatePixPayment.mockResolvedValue({
      id: "mp_approved",
      status: "approved",
      statusDetail: "accredited",
      pix: {
        qrCode: null,
        qrCodeBase64: null,
        ticketUrl: null,
      },
    });

    await expect(createMercadoPagoPixPayment()).rejects.toThrow(
      "NEXT_REDIRECT:/checkout/sucesso?mp_payment_id=mp_approved&processed=1",
    );

    expect(mockedCartUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: expect.objectContaining({
        mercadoPagoPaymentId: "mp_approved",
        mercadoPagoStatus: "approved",
        paymentStatus: PaymentStatus.PAID,
      }),
    });
    expect(mockedFulfillPaidCart).toHaveBeenCalledWith({
      cartId: "cart-1",
      userId: "user-1",
      mercadoPagoPaymentId: "mp_approved",
    });
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/checkout/sucesso?mp_payment_id=mp_approved&processed=1",
    );
  });
});
