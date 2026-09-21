import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: "whsec_test",
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      updateMany: vi.fn(),
    },
    stripeWebhookEvent: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/checkout-fulfillment", () => ({
  fulfillPaidCart: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

import { PaymentStatus } from "@prisma/client";
import { fulfillPaidCart } from "@/lib/checkout-fulfillment";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { GET, POST } from "./route";

const mockedConstructEvent = vi.mocked(stripe.webhooks.constructEvent);
const mockedUpdateMany = vi.mocked(prisma.cart.updateMany);
const mockedWebhookEventCreate = vi.mocked(prisma.stripeWebhookEvent.create);
const mockedWebhookEventUpdate = vi.mocked(prisma.stripeWebhookEvent.update);
const mockedWebhookEventDelete = vi.mocked(prisma.stripeWebhookEvent.delete);
const mockedFulfillPaidCart = vi.mocked(fulfillPaidCart);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/stripe/webhook", () => {
  it("returns a health check for browser visits", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      service: "stripe-webhook",
      method: "POST",
    });
  });
});

describe("POST /api/stripe/webhook", () => {
  it("rejects requests without Stripe signature", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Assinatura Stripe ausente");
  });

  it("marks the cart as paid when checkout is completed", async () => {
    mockedConstructEvent.mockReturnValue({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          metadata: {
            cartId: "cart-1",
            userId: "user-1",
          },
          payment_status: "paid",
          payment_intent: "pi_1",
        },
      },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>);

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "test-signature",
        },
        body: "{}",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockedWebhookEventCreate).toHaveBeenCalledWith({
      data: {
        id: "evt_1",
        type: "checkout.session.completed",
        objectId: "cs_test_1",
      },
    });
    expect(mockedFulfillPaidCart).toHaveBeenCalledWith({
      cartId: "cart-1",
      userId: "user-1",
      stripeCheckoutSessionId: "cs_test_1",
      stripePaymentIntentId: "pi_1",
    });
    expect(mockedWebhookEventUpdate).toHaveBeenCalledWith({
      where: {
        id: "evt_1",
      },
      data: {
        processedAt: expect.any(Date),
      },
    });
  });

  it("does not process duplicate Stripe events", async () => {
    mockedConstructEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_duplicate",
          payment_status: "paid",
          payment_intent: "pi_duplicate",
        },
      },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>);
    mockedWebhookEventCreate.mockRejectedValueOnce({ code: "P2002" });

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "test-signature",
        },
        body: "{}",
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ received: true, duplicate: true });
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedFulfillPaidCart).not.toHaveBeenCalled();
    expect(mockedWebhookEventUpdate).not.toHaveBeenCalled();
  });

  it("keeps unpaid completed sessions pending", async () => {
    mockedConstructEvent.mockReturnValue({
      id: "evt_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_2",
          payment_status: "unpaid",
          payment_intent: "pi_2",
        },
      },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>);

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "test-signature",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedFulfillPaidCart).not.toHaveBeenCalled();
    expect(mockedWebhookEventUpdate).toHaveBeenCalledWith({
      where: {
        id: "evt_2",
      },
      data: {
        processedAt: expect.any(Date),
      },
    });
  });

  it("does not mark no-payment-required sessions as paid", async () => {
    mockedConstructEvent.mockReturnValue({
      id: "evt_no_payment_required",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_no_payment_required",
          payment_status: "no_payment_required",
          payment_intent: null,
        },
      },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>);

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "test-signature",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
    expect(mockedFulfillPaidCart).not.toHaveBeenCalled();
  });

  it("marks async failed payments as failed", async () => {
    mockedConstructEvent.mockReturnValue({
      id: "evt_3",
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_test_3",
        },
      },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>);

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "test-signature",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: {
        stripeCheckoutSessionId: "cs_test_3",
        paymentStatus: PaymentStatus.PENDING,
      },
      data: {
        paymentStatus: PaymentStatus.FAILED,
      },
    });
  });

  it("releases event reservation when processing fails", async () => {
    mockedConstructEvent.mockReturnValue({
      id: "evt_error",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_error",
          payment_status: "paid",
          payment_intent: "pi_error",
        },
      },
    } as unknown as ReturnType<typeof stripe.webhooks.constructEvent>);
    mockedFulfillPaidCart.mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    await expect(
      POST(
        new Request("http://localhost/api/stripe/webhook", {
          method: "POST",
          headers: {
            "stripe-signature": "test-signature",
          },
          body: "{}",
        }),
      ),
    ).rejects.toThrow("database unavailable");

    expect(mockedWebhookEventDelete).toHaveBeenCalledWith({
      where: {
        id: "evt_error",
      },
    });
  });
});
