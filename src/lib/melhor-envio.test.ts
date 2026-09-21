import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  MELHOR_ENVIO_TOKEN: "test-token",
  MELHOR_ENVIO_ORIGIN_DOCUMENT: undefined as string | undefined,
  NEXT_PUBLIC_URL: "http://localhost:3000",
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

import {
  calculateMelhorEnvioShippingOptions,
  createMelhorEnvioShipment,
} from "@/lib/melhor-envio";

const mockedFetch = vi.fn();

function buildToken(scopes: string[]) {
  return (
    "header." +
    Buffer.from(JSON.stringify({ scopes })).toString("base64url") +
    ".signature"
  );
}

const shipmentScopes = [
  "shipping-calculate",
  "shipping-checkout",
  "shipping-generate",
  "shipping-print",
];

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.MELHOR_ENVIO_TOKEN = "test-token";
  mockEnv.MELHOR_ENVIO_ORIGIN_DOCUMENT = undefined;
  mockEnv.NEXT_PUBLIC_URL = "http://localhost:3000";
  global.fetch = mockedFetch;
});

describe("calculateMelhorEnvioShippingOptions", () => {
  it("returns all valid shipping quotes ordered by price", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 33,
            name: "Standard",
            company: { name: "JeT" },
            price: "11.41",
            delivery_time: 2,
          },
          {
            id: 1,
            name: "PAC",
            company: { name: "Loggi" },
            price: "25.80",
            custom_price: "12.00",
            delivery_time: 10,
          },
        ]),
        { status: 200 },
      ),
    );

    await expect(
      calculateMelhorEnvioShippingOptions({
        postalCode: "04434270",
        subtotal: 153.51,
        quantity: 1,
        items: [
          {
            quantity: 1,
            unitPrice: 153.51,
            lengthCm: 20,
            widthCm: 16,
            heightCm: 5,
            weightKg: 0.5,
          },
        ],
      }),
    ).resolves.toEqual([
      {
        method: "melhor-envio:33",
        label: "JeT - Standard",
        price: 11.41,
        estimatedDays: 2,
      },
      {
        method: "melhor-envio:1",
        label: "Loggi - PAC",
        price: 25.8,
        estimatedDays: 10,
      },
    ]);
  });

  it("ignores quotes with carrier errors", async () => {
    mockedFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 33,
            name: "Standard",
            company: { name: "JeT" },
            price: "11.41",
            delivery_time: 2,
          },
          {
            id: 1,
            name: "PAC",
            company: { name: "Loggi" },
            error: "Transportadora nao atende este trecho.",
          },
        ]),
        { status: 200 },
      ),
    );

    await expect(
      calculateMelhorEnvioShippingOptions({
        postalCode: "04434270",
        subtotal: 153.51,
        quantity: 1,
      }),
    ).resolves.toEqual([
      {
        method: "melhor-envio:33",
        label: "JeT - Standard",
        price: 11.41,
        estimatedDays: 2,
      },
    ]);
  });
});

describe("createMelhorEnvioShipment", () => {
  it("explains when the token only has shipping calculation scope", async () => {
    mockEnv.MELHOR_ENVIO_TOKEN = buildToken(["shipping-calculate"]);

    await expect(
      createMelhorEnvioShipment({
        cartId: "cart-1",
        method: "melhor-envio:1",
        shippingPrice: 20,
        recipient: {
          name: "Cliente Teste",
          document: "93541134780",
          phone: "19999999999",
          postalCode: "01001000",
          street: "Rua Teste",
          number: "123",
          neighborhood: "Centro",
          city: "Sao Paulo",
          state: "SP",
        },
        items: [
          {
            name: "Produto",
            quantity: 1,
            unitPrice: 10,
          },
        ],
      }),
    ).rejects.toThrow("Escopos ausentes: shipping-checkout");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("sends the default store CNPJ as company_document when creating a shipment", async () => {
    mockEnv.MELHOR_ENVIO_TOKEN = buildToken(shipmentScopes);
    mockedFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "order-1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "order-1" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tracking: "BR123456789" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://labels.test/1.pdf" })),
      );

    await expect(
      createMelhorEnvioShipment({
        cartId: "cart-1",
        method: "melhor-envio:1",
        shippingPrice: 20,
        recipient: {
          name: "Cliente Teste",
          document: "93541134780",
          phone: "19999999999",
          postalCode: "01001000",
          street: "Rua Teste",
          number: "123",
          neighborhood: "Centro",
          city: "Sao Paulo",
          state: "SP",
        },
        items: [
          {
            name: "Produto",
            quantity: 1,
            unitPrice: 10,
          },
        ],
      }),
    ).resolves.toMatchObject({
      id: "order-1",
      trackingCode: "BR123456789",
      labelRequestId: "https://labels.test/1.pdf",
    });

    const firstRequest = mockedFetch.mock.calls[0];
    const payload = JSON.parse(firstRequest[1].body as string);

    expect(firstRequest[0]).toContain("/api/v2/me/cart");
    expect(payload.from.document).toBeUndefined();
    expect(payload.from.company_document).toBe("24928572000101");
    expect(payload.to.document).toBe("93541134780");
    expect(payload.options.tags).toEqual([{ tag: "cart-1" }]);
  });

  it("sends an origin CPF as document when configured", async () => {
    mockEnv.MELHOR_ENVIO_ORIGIN_DOCUMENT = "123.456.789-09";
    mockEnv.MELHOR_ENVIO_TOKEN = buildToken(shipmentScopes);
    mockedFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "order-1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "order-1" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tracking: "BR123456789" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://labels.test/1.pdf" })),
      );

    await createMelhorEnvioShipment({
      cartId: "cart-1",
      method: "melhor-envio:1",
      shippingPrice: 20,
      recipient: {
        name: "Cliente Teste",
        document: "93541134780",
        phone: "19999999999",
        postalCode: "01001000",
        street: "Rua Teste",
        number: "123",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
      },
      items: [
        {
          name: "Produto",
          quantity: 1,
          unitPrice: 10,
        },
      ],
    });

    const payload = JSON.parse(mockedFetch.mock.calls[0][1].body as string);

    expect(payload.from.document).toBe("12345678909");
    expect(payload.from.company_document).toBeUndefined();
  });

  it("sends a public order URL in tags when the configured site URL is public", async () => {
    mockEnv.NEXT_PUBLIC_URL = "https://loja.example.com";
    mockEnv.MELHOR_ENVIO_TOKEN = buildToken(shipmentScopes);
    mockedFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "order-1" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "order-1" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tracking: "BR123456789" })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://labels.test/1.pdf" })),
      );

    await createMelhorEnvioShipment({
      cartId: "cart-1",
      method: "melhor-envio:1",
      shippingPrice: 20,
      recipient: {
        name: "Cliente Teste",
        document: "93541134780",
        phone: "19999999999",
        postalCode: "01001000",
        street: "Rua Teste",
        number: "123",
        neighborhood: "Centro",
        city: "Sao Paulo",
        state: "SP",
      },
      items: [
        {
          name: "Produto",
          quantity: 1,
          unitPrice: 10,
        },
      ],
    });

    const payload = JSON.parse(mockedFetch.mock.calls[0][1].body as string);

    expect(payload.options.tags).toEqual([
      {
        tag: "cart-1",
        url: "https://loja.example.com/dashboard/pedidos?q=cart-1",
      },
    ]);
  });

  it("adds endpoint context to HTML 403 errors", async () => {
    mockEnv.MELHOR_ENVIO_TOKEN = buildToken(shipmentScopes);
    mockedFetch.mockResolvedValueOnce(
      new Response(
        "<html><body><center><h1>403 Forbidden</h1></center></body></html>",
        {
          status: 403,
          headers: {
            "Content-Type": "text/html",
          },
        },
      ),
    );

    await expect(
      createMelhorEnvioShipment({
        cartId: "cart-1",
        method: "melhor-envio:1",
        shippingPrice: 20,
        recipient: {
          name: "Cliente Teste",
          document: "93541134780",
          phone: "19999999999",
          postalCode: "01001000",
          street: "Rua Teste",
          number: "123",
          neighborhood: "Centro",
          city: "Sao Paulo",
          state: "SP",
        },
        items: [
          {
            name: "Produto",
            quantity: 1,
            unitPrice: 10,
          },
        ],
      }),
    ).rejects.toThrow("pagina HTML de bloqueio");
  });
});
