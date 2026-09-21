import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

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

import { syncMercadoPagoPixPayment } from "@/lib/mercado-pago-checkout";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

const mockedSyncMercadoPagoPixPayment = vi.mocked(syncMercadoPagoPixPayment);
const mockedFindCart = prisma.cart.findFirst as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockedFindCart.mockResolvedValue({
    _count: {
      items: 1,
    },
  });
});

describe("GET /api/checkout/pix/[paymentId]", () => {
  it("returns the success redirect when the Pix payment is approved", async () => {
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

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ paymentId: "mp_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "mp_1",
      status: "approved",
      statusLabel: "Pagamento aprovado",
      approved: true,
      redirectUrl: "/checkout/sucesso?mp_payment_id=mp_1&processed=1",
    });
  });

  it("returns pending status without redirect", async () => {
    mockedSyncMercadoPagoPixPayment.mockResolvedValue({
      id: "mp_1",
      status: "pending",
      statusDetail: "pending_waiting_payment",
      externalReference: "cart-1",
      metadata: {
        cartId: undefined,
        userId: undefined,
      },
      transactionAmount: 52.9,
      createdAt: "2026-06-25T12:00:00.000Z",
      approvedAt: null,
      pix: {
        qrCode: "pix-code",
        qrCodeBase64: "base64",
        ticketUrl: null,
      },
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ paymentId: "mp_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "pending",
      approved: false,
      redirectUrl: null,
    });
  });

  it("returns a home redirect when the Pix cart was emptied before approval", async () => {
    mockedFindCart.mockResolvedValueOnce({
      _count: {
        items: 0,
      },
    });
    mockedSyncMercadoPagoPixPayment.mockResolvedValue({
      id: "mp_1",
      status: "pending",
      statusDetail: "pending_waiting_payment",
      externalReference: "cart-1",
      metadata: {
        cartId: "cart-1",
        userId: "user-1",
      },
      transactionAmount: 52.9,
      createdAt: "2026-06-25T12:00:00.000Z",
      approvedAt: null,
      pix: {
        qrCode: "pix-code",
        qrCodeBase64: "base64",
        ticketUrl: null,
      },
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ paymentId: "mp_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "pending",
      approved: false,
      redirectUrl: "/",
    });
  });
});
