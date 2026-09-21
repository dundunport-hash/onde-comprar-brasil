import { CartStatus, PaymentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/checkout-fulfillment", () => ({
  ensureMelhorEnvioShipmentForPaidCart: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { ensureMelhorEnvioShipmentForPaidCart } from "@/lib/checkout-fulfillment";
import { prisma } from "@/lib/prisma";
import {
  deleteOrder,
  generateMelhorEnvioShippingLabel,
  updateOrderStatus,
  updatePaymentStatus,
} from "./actions";

const mockedRequireAdminSession = requireAdminSession as unknown as Mock;
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedRedirect = vi.mocked(redirect);
const mockedDelete = prisma.cart.delete as unknown as Mock;
const mockedFindUnique = prisma.cart.findUnique as unknown as Mock;
const mockedUpdate = prisma.cart.update as unknown as Mock;
const mockedEnsureMelhorEnvioShipmentForPaidCart =
  ensureMelhorEnvioShipmentForPaidCart as unknown as Mock;

function buildOrderStatusForm(status: CartStatus = CartStatus.CHECKED_OUT) {
  const formData = new FormData();
  formData.set("orderId", "cart-1");
  formData.set("status", status);
  return formData;
}

function buildPaymentStatusForm(
  paymentStatus: PaymentStatus = PaymentStatus.PAID,
) {
  const formData = new FormData();
  formData.set("orderId", "cart-1");
  formData.set("paymentStatus", paymentStatus);
  return formData;
}

function buildDeleteOrderForm(orderId = "cart-1") {
  const formData = new FormData();
  formData.set("orderId", orderId);
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAdminSession.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "ADMIN",
    },
  });
  mockedEnsureMelhorEnvioShipmentForPaidCart.mockResolvedValue({
    created: true,
    reason: "created",
  });
  mockedUpdate.mockResolvedValue({
    id: "cart-1",
    status: CartStatus.CHECKED_OUT,
  });
});

describe("order admin actions", () => {
  it("updates the order status and refreshes admin dashboards", async () => {
    await updateOrderStatus(buildOrderStatusForm(CartStatus.ABANDONED));

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: {
        status: CartStatus.ABANDONED,
      },
      select: {
        id: true,
        status: true,
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/pedidos");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/metricas");
  });

  it("updates the order status to awaiting shipment", async () => {
    await updateOrderStatus(buildOrderStatusForm(CartStatus.AWAITING_SHIPMENT));

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: CartStatus.AWAITING_SHIPMENT,
        },
      }),
    );
  });

  it("updates the order status to separated and shipped", async () => {
    await updateOrderStatus(buildOrderStatusForm(CartStatus.SEPARATED_SHIPPED));

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: CartStatus.SEPARATED_SHIPPED,
        },
      }),
    );
  });

  it("updates the order status to delivered", async () => {
    await updateOrderStatus(buildOrderStatusForm(CartStatus.DELIVERED));

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: CartStatus.DELIVERED,
        },
      }),
    );
  });

  it("updates the order status to awaiting pickup", async () => {
    await updateOrderStatus(buildOrderStatusForm(CartStatus.AWAITING_PICKUP));

    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: CartStatus.AWAITING_PICKUP,
        },
      }),
    );
  });

  it("marks an active order as paid and checked out", async () => {
    mockedFindUnique.mockResolvedValue({
      paidAt: null,
      status: CartStatus.ACTIVE,
    });
    mockedUpdate.mockResolvedValue({
      id: "cart-1",
      paymentStatus: PaymentStatus.PAID,
      status: CartStatus.CHECKED_OUT,
      paidAt: new Date("2026-05-18T12:00:00"),
    });

    await updatePaymentStatus(buildPaymentStatusForm(PaymentStatus.PAID));

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: expect.any(Date),
        status: CartStatus.CHECKED_OUT,
      },
    });
    expect(mockedEnsureMelhorEnvioShipmentForPaidCart).toHaveBeenCalledWith(
      "cart-1",
    );
  });

  it("generates a Melhor Envio shipping label for an order", async () => {
    await generateMelhorEnvioShippingLabel(buildDeleteOrderForm());

    expect(mockedEnsureMelhorEnvioShipmentForPaidCart).toHaveBeenCalledWith(
      "cart-1",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/pedidos");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a clear error when a label cannot be generated before payment", async () => {
    mockedEnsureMelhorEnvioShipmentForPaidCart.mockResolvedValueOnce({
      created: false,
      reason: "cart-not-paid",
    });

    await expect(
      generateMelhorEnvioShippingLabel(buildDeleteOrderForm()),
    ).rejects.toThrow("A etiqueta so pode ser gerada para pedidos pagos.");
  });

  it("redirects with visible feedback when Melhor Envio rejects label creation", async () => {
    mockedEnsureMelhorEnvioShipmentForPaidCart.mockResolvedValueOnce({
      created: false,
      reason: "failed",
      message: "/api/v2/me/cart retornou HTTP 403.",
    });

    await expect(
      generateMelhorEnvioShippingLabel(buildDeleteOrderForm()),
    ).rejects.toThrow("NEXT_REDIRECT:");

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/pedidos");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRedirect).toHaveBeenCalledWith(
      expect.stringContaining("labelFeedback=error"),
    );
    expect(mockedRedirect).toHaveBeenCalledWith(
      expect.stringContaining("order=CART-1"),
    );
  });

  it("shows WAF guidance when Melhor Envio returns an HTML 403 block", async () => {
    mockedEnsureMelhorEnvioShipmentForPaidCart.mockResolvedValueOnce({
      created: false,
      reason: "failed",
      message:
        "/api/v2/me/cart retornou HTTP 403. A API retornou uma pagina HTML de bloqueio.",
    });

    await expect(
      generateMelhorEnvioShippingLabel(buildDeleteOrderForm()),
    ).rejects.toThrow("NEXT_REDIRECT:");

    expect(mockedRedirect).toHaveBeenCalledWith(
      expect.stringContaining("bloqueou+a+requisicao"),
    );
  });

  it("preserves paidAt when moving a payment to a non-paid status", async () => {
    const paidAt = new Date("2026-05-18T12:00:00");
    mockedFindUnique.mockResolvedValue({
      paidAt,
      status: CartStatus.CHECKED_OUT,
    });

    await updatePaymentStatus(buildPaymentStatusForm(PaymentStatus.CANCELED));

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
      data: {
        paymentStatus: PaymentStatus.CANCELED,
        paidAt,
        status: CartStatus.CHECKED_OUT,
      },
    });
  });

  it("rejects payment updates for missing orders", async () => {
    mockedFindUnique.mockResolvedValue(null);

    await expect(
      updatePaymentStatus(buildPaymentStatusForm(PaymentStatus.PAID)),
    ).rejects.toThrow("Pedido nao encontrado.");

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("deletes unpaid orders and refreshes admin dashboards", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "cart-1",
      status: CartStatus.ABANDONED,
      paymentStatus: PaymentStatus.CANCELED,
      userId: "user-1",
      stripeCheckoutSessionId: "cs_1",
      _count: {
        items: 2,
      },
    });

    await deleteOrder(buildDeleteOrderForm());

    expect(mockedDelete).toHaveBeenCalledWith({
      where: {
        id: "cart-1",
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/pedidos");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/metricas");
  });

  it("blocks deletion for paid orders", async () => {
    mockedFindUnique.mockResolvedValue({
      id: "cart-1",
      status: CartStatus.CHECKED_OUT,
      paymentStatus: PaymentStatus.PAID,
      userId: "user-1",
      stripeCheckoutSessionId: "cs_1",
      _count: {
        items: 2,
      },
    });

    await expect(deleteOrder(buildDeleteOrderForm())).rejects.toThrow(
      "Pedidos pagos nao podem ser excluidos.",
    );

    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
