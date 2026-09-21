import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/cart", () => ({
  cartInclude: {
    items: true,
  },
  getOrCreateCart: vi.fn(),
}));

vi.mock("@/lib/checkout-fulfillment", () => ({
  ensureMelhorEnvioShipmentForPaidCart: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
    checkoutAddress: {
      upsert: vi.fn(),
    },
    cart: {
      findFirst: vi.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { ensureMelhorEnvioShipmentForPaidCart } from "@/lib/checkout-fulfillment";
import { getOrCreateCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { saveCheckoutAddress } from "./actions";
import { initialCheckoutAddressState } from "./state";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedGetOrCreateCart = vi.mocked(getOrCreateCart) as unknown as Mock;
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedUpsert = prisma.checkoutAddress.upsert as unknown as Mock;
const mockedUserUpdate = prisma.user.update as unknown as Mock;
const mockedCartFindFirst = prisma.cart.findFirst as unknown as Mock;
const mockedEnsureMelhorEnvioShipmentForPaidCart =
  ensureMelhorEnvioShipmentForPaidCart as unknown as Mock;

function buildAddressForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    fullName: "Maria Silva",
    document: "935.411.347-80",
    phone: "(11) 99999-9999",
    postalCode: "01001-000",
    street: "Praca da Se",
    number: "100",
    complement: "Apto 12",
    neighborhood: "Se",
    city: "Sao Paulo",
    state: "SP",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetServerSession.mockResolvedValue({
    user: {
      id: "user-1",
    },
  });
  mockedGetOrCreateCart.mockResolvedValue({
    id: "cart-1",
    items: [
      {
        id: "item-1",
        quantity: 1,
        product: {
          id: "product-1",
          name: "Dipirona",
          stock: 5,
          active: true,
        },
      },
    ],
  });
  mockedCartFindFirst.mockResolvedValue(null);
  mockedUpsert.mockResolvedValue({
    id: "address-1",
    cartId: "cart-1",
    fullName: "Maria Silva",
    document: "93541134780",
    phone: "11999999999",
    postalCode: "01001000",
    street: "Praca da Se",
    number: "100",
    complement: "Apto 12",
    neighborhood: "Se",
    city: "Sao Paulo",
    state: "SP",
  });
  mockedEnsureMelhorEnvioShipmentForPaidCart.mockResolvedValue({
    created: true,
    reason: "created",
  });
});

describe("saveCheckoutAddress", () => {
  it("validates address fields before saving", async () => {
    const result = await saveCheckoutAddress(
      initialCheckoutAddressState,
      buildAddressForm({
        fullName: "",
        document: "11111111111",
        postalCode: "123",
      }),
    );

    expect(result.status).toBe("error");
    expect(result.errors).toMatchObject({
      fullName: "Informe o nome completo.",
      document: "Informe um CPF valido.",
      postalCode: "Informe um CEP SOMENTE NÚMEROS com 8 digitos.",
    });
    expect(mockedUpsert).not.toHaveBeenCalled();
  });

  it("saves a normalized address for the current cart", async () => {
    const result = await saveCheckoutAddress(
      initialCheckoutAddressState,
      buildAddressForm(),
    );

    expect(result.status).toBe("success");
    expect(result.message).toBe(
      "Endereco salvo com sucesso. Voce sera redirecionado para a confirmacao do pedido.",
    );
    expect(mockedUpsert).toHaveBeenCalledWith({
      where: {
        cartId: "cart-1",
      },
      create: {
        fullName: "Maria Silva",
        document: "93541134780",
        phone: "11999999999",
        postalCode: "01001000",
        street: "Praca da Se",
        number: "100",
        complement: "Apto 12",
        neighborhood: "Se",
        city: "Sao Paulo",
        state: "SP",
        cartId: "cart-1",
        userId: "user-1",
      },
      update: {
        fullName: "Maria Silva",
        document: "93541134780",
        phone: "11999999999",
        postalCode: "01001000",
        street: "Praca da Se",
        number: "100",
        complement: "Apto 12",
        neighborhood: "Se",
        city: "Sao Paulo",
        state: "SP",
        userId: "user-1",
      },
    });
    expect(mockedUserUpdate).toHaveBeenCalledWith({
      where: {
        id: "user-1",
      },
      data: {
        phone: "11999999999",
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/checkout/endereco");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/pedidos");
  });

  it("creates the Melhor Envio shipment after saving an address for a paid Pix order", async () => {
    mockedCartFindFirst.mockResolvedValue({
      id: "cart-pix",
      paidAt: new Date("2026-06-25T12:00:00.000Z"),
      items: [
        {
          id: "item-1",
          quantity: 1,
          product: {
            id: "product-1",
            name: "Dipirona",
            stock: 5,
            active: true,
          },
        },
      ],
    });

    const formData = buildAddressForm();
    formData.set("mercadoPagoPaymentId", "mp_1");

    const result = await saveCheckoutAddress(
      initialCheckoutAddressState,
      formData,
    );

    expect(result.status).toBe("success");
    expect(mockedCartFindFirst).toHaveBeenCalledWith({
      where: {
        mercadoPagoPaymentId: "mp_1",
      },
      include: expect.any(Object),
    });
    expect(mockedEnsureMelhorEnvioShipmentForPaidCart).toHaveBeenCalledWith(
      "cart-pix",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/pedidos");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("blocks checkout when the cart is empty", async () => {
    mockedGetOrCreateCart.mockResolvedValue({
      id: "cart-1",
      items: [],
    });

    const result = await saveCheckoutAddress(
      initialCheckoutAddressState,
      buildAddressForm(),
    );

    expect(result).toMatchObject({
      status: "error",
      message: "Seu carrinho esta vazio.",
    });
    expect(mockedUpsert).not.toHaveBeenCalled();
  });
});
