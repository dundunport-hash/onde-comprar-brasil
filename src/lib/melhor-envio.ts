import { normalizePostalCode } from "@/lib/address";
import { env } from "@/lib/env";
import { roundMoney } from "@/lib/pricing";
import type {
  ShippingCalculationInput,
  ShippingOption,
  ShippingPackageItem,
} from "@/lib/shipping";
import { SITE_NAME } from "@/lib/store-contact";

type MelhorEnvioQuote = {
  id?: number | string;
  name?: string;
  price?: string | number | null;
  custom_price?: string | number | null;
  delivery_time?: number | string | null;
  custom_delivery_time?: number | string | null;
  error?: string | null;
  company?: {
    name?: string | null;
  } | null;
};

type MelhorEnvioPackage = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  unitPrice: number;
  quantity: number;
};

type MelhorEnvioAddress = {
  name: string;
  document?: string | null;
  phone: string;
  email?: string | null;
  postalCode: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

export type MelhorEnvioShipmentInput = {
  cartId: string;
  method: string | null;
  shippingPrice: number | null;
  recipient: MelhorEnvioAddress;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    weightKg?: number | null;
  }>;
};

type MelhorEnvioShipmentResult = {
  id: string | null;
  trackingCode: string | null;
  labelRequestId: string | null;
  rawCart: unknown;
  rawCheckout: unknown;
  rawGenerate: unknown;
  rawPrint: unknown;
};

type MelhorEnvioJwtPayload = {
  scopes?: unknown;
  scope?: unknown;
};

const DEFAULT_API_URL = "https://www.melhorenvio.com.br";
const DEFAULT_USER_AGENT = `${SITE_NAME} (suporte@drogariamegapopular.com.br)`;
const DEFAULT_ORIGIN_POSTAL_CODE = "13049133";
const DEFAULT_ORIGIN_NAME = SITE_NAME;
const DEFAULT_ORIGIN_PHONE = "19981880619";
const DEFAULT_ORIGIN_EMAIL = "suporte@drogariamegapopular.com.br";
const DEFAULT_ORIGIN_DOCUMENT = "24928572000101";
const DEFAULT_ORIGIN_STREET = "R. Francisco Gomes de Souza";
const DEFAULT_ORIGIN_NUMBER = "08";
const DEFAULT_ORIGIN_NEIGHBORHOOD = "Jardim Monte Cristo";
const DEFAULT_ORIGIN_CITY = "Campinas";
const DEFAULT_ORIGIN_STATE = "SP";
const DEFAULT_STANDARD_SERVICE_ID = 1;
const DEFAULT_EXPRESS_SERVICE_ID = 2;
const DEFAULT_WEIGHT_GRAMS = 500;
const DEFAULT_LENGTH_CM = 20;
const DEFAULT_WIDTH_CM = 16;
const DEFAULT_HEIGHT_CM = 5;
const SHIPMENT_REQUIRED_SCOPES = [
  "shipping-calculate",
  "shipping-checkout",
  "shipping-generate",
  "shipping-print",
];

function getMelhorEnvioBaseUrl() {
  return (env.MELHOR_ENVIO_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

function requireMelhorEnvioToken() {
  const token = env.MELHOR_ENVIO_TOKEN ?? env.Access_Token_Melhor_envio;

  if (!token) {
    throw new Error(
      "Configure MELHOR_ENVIO_TOKEN ou Access_Token_Melhor_envio.",
    );
  }

  return token;
}

function decodeJwtPayload(token: string): MelhorEnvioJwtPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function getTokenScopes(token: string) {
  const payload = decodeJwtPayload(token);
  const scopes = payload?.scopes;
  const scope = payload?.scope;

  if (Array.isArray(scopes)) {
    return scopes.filter((item): item is string => typeof item === "string");
  }

  if (typeof scope === "string") {
    return scope.split(/\s+/).filter(Boolean);
  }

  return [];
}

function assertMelhorEnvioTokenScopes(requiredScopes: string[]) {
  const token = requireMelhorEnvioToken();
  const currentScopes = getTokenScopes(token);

  if (currentScopes.length === 0) {
    return;
  }

  const missingScopes = requiredScopes.filter(
    (scope) => !currentScopes.includes(scope),
  );

  if (missingScopes.length === 0) {
    return;
  }

  throw new Error(
    `Token do Melhor Envio sem permissoes para gerar etiqueta. Escopos ausentes: ${missingScopes.join(
      ", ",
    )}. Escopos atuais: ${currentScopes.join(", ")}. Gere uma nova autorizacao em /api/melhor-envio/authorize.`,
  );
}

export function getMelhorEnvioShipmentScopeStatus() {
  let token: string;

  try {
    token = requireMelhorEnvioToken();
  } catch {
    return {
      configured: false,
      canVerifyScopes: true,
      canGenerateLabels: false,
      currentScopes: [] as string[],
      missingScopes: SHIPMENT_REQUIRED_SCOPES,
    };
  }

  const currentScopes = getTokenScopes(token);

  if (currentScopes.length === 0) {
    return {
      configured: true,
      canVerifyScopes: false,
      canGenerateLabels: true,
      currentScopes,
      missingScopes: [] as string[],
    };
  }

  const missingScopes = SHIPMENT_REQUIRED_SCOPES.filter(
    (scope) => !currentScopes.includes(scope),
  );

  return {
    configured: true,
    canVerifyScopes: true,
    canGenerateLabels: missingScopes.length === 0,
    currentScopes,
    missingScopes,
  };
}

function getOriginPostalCode() {
  return normalizePostalCode(DEFAULT_ORIGIN_POSTAL_CODE);
}

function getOriginAddress(): MelhorEnvioAddress {
  return {
    name: DEFAULT_ORIGIN_NAME,
    phone: DEFAULT_ORIGIN_PHONE,
    email: env.MELHOR_ENVIO_ORIGIN_EMAIL ?? DEFAULT_ORIGIN_EMAIL,
    postalCode: getOriginPostalCode(),
    street: DEFAULT_ORIGIN_STREET,
    number: DEFAULT_ORIGIN_NUMBER,
    complement: null,
    neighborhood: DEFAULT_ORIGIN_NEIGHBORHOOD,
    city: DEFAULT_ORIGIN_CITY,
    state: DEFAULT_ORIGIN_STATE,
  };
}

function getPositiveNumber(value: number | null | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function normalizePackageItem(
  item: ShippingPackageItem,
  fallbackUnitPrice: number,
): MelhorEnvioPackage {
  return {
    weightKg: getPositiveNumber(item.weightKg, DEFAULT_WEIGHT_GRAMS / 1000),
    lengthCm: getPositiveNumber(item.lengthCm, DEFAULT_LENGTH_CM),
    widthCm: getPositiveNumber(item.widthCm, DEFAULT_WIDTH_CM),
    heightCm: getPositiveNumber(item.heightCm, DEFAULT_HEIGHT_CM),
    unitPrice: roundMoney(Math.max(item.unitPrice || fallbackUnitPrice, 0)),
    quantity: Math.max(Math.round(item.quantity), 1),
  };
}

function getPackageItems({
  items,
  quantity,
  subtotal,
}: ShippingCalculationInput): MelhorEnvioPackage[] {
  const fallbackQuantity = Math.max(quantity, 1);
  const fallbackUnitPrice = roundMoney(
    Math.max(subtotal, 0) / fallbackQuantity,
  );

  if (items?.length) {
    return items.map((item) => normalizePackageItem(item, fallbackUnitPrice));
  }

  return [
    normalizePackageItem(
      {
        quantity: fallbackQuantity,
        unitPrice: fallbackUnitPrice,
        lengthCm: DEFAULT_LENGTH_CM,
        widthCm: DEFAULT_WIDTH_CM,
        heightCm: DEFAULT_HEIGHT_CM,
        weightKg: DEFAULT_WEIGHT_GRAMS / 1000,
      },
      fallbackUnitPrice,
    ),
  ];
}

async function readMelhorEnvioResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getMelhorEnvioErrorMessage(data: unknown) {
  if (data && typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    const error = (data as { error?: unknown }).error;
    const errors = (data as { errors?: unknown }).errors;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    if (typeof error === "string" && error.length > 0) {
      return error;
    }

    if (errors && typeof errors === "object") {
      const messages = Object.entries(errors as Record<string, unknown>)
        .flatMap(([field, value]) => {
          if (Array.isArray(value)) {
            return value
              .filter((item): item is string => typeof item === "string")
              .map((item) => `${field}: ${item}`);
          }

          return typeof value === "string" ? [`${field}: ${value}`] : [];
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  if (typeof data === "string" && data.length > 0) {
    return data;
  }

  return "Nao foi possivel comunicar com o Melhor Envio.";
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHtmlForbiddenResponse(data: unknown) {
  return typeof data === "string" && /<html|forbidden|403/i.test(data);
}

function getMelhorEnvioHttpErrorMessage({
  data,
  path,
  status,
}: {
  data: unknown;
  path: string;
  status: number;
}) {
  const message =
    typeof data === "string"
      ? stripHtml(data)
      : getMelhorEnvioErrorMessage(data);
  const endpoint = `${path} retornou HTTP ${status}`;

  if (status === 403 && isHtmlForbiddenResponse(data)) {
    return `${endpoint}. A API retornou uma pagina HTML de bloqueio, antes de validar o pedido. Isso costuma indicar bloqueio de seguranca do Melhor Envio/WAF, URL local no payload, IP bloqueado ou token de outro ambiente. Resposta: ${message || "403 Forbidden"}`;
  }

  if (status === 403) {
    return `${endpoint}. O Melhor Envio recusou esta etapa. Confira se a conta tem permissao operacional para comprar/gerar etiquetas, saldo ou forma de pagamento ativa, e se o token foi emitido para o mesmo ambiente da API. Resposta: ${message || "Forbidden"}`;
  }

  return `${endpoint}: ${message}`;
}

function parseMoney(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? roundMoney(value) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? roundMoney(parsed) : null;
}

function parseDays(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 1) : null;
}

function parseAllowedList(value: string | undefined) {
  const parsed = value
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return parsed && parsed.length > 0 ? parsed : [];
}

function getQuotePrice(quote: MelhorEnvioQuote) {
  return parseMoney(quote.price ?? quote.custom_price);
}

function getQuoteDays(quote: MelhorEnvioQuote) {
  return parseDays(quote.delivery_time ?? quote.custom_delivery_time);
}

function quoteToLabel(quote: MelhorEnvioQuote) {
  const companyName = quote.company?.name?.trim();
  const serviceName = quote.name?.trim();

  return (
    [companyName, serviceName].filter(Boolean).join(" - ") || "Melhor Envio"
  );
}

function getQuoteCompanyName(quote: MelhorEnvioQuote) {
  return quote.company?.name?.trim().toLowerCase() ?? "";
}

function getQuoteServiceName(quote: MelhorEnvioQuote) {
  return quote.name?.trim().toLowerCase() ?? "";
}

function pickString(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") {
    return null;
  }

  for (const key of keys) {
    const value = (source as Record<string, unknown>)[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return null;
}

function pickNestedString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const direct = pickString(source, keys);

  if (direct) {
    return direct;
  }

  for (const value of Object.values(source as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = pickNestedString(item, keys);

        if (nested) {
          return nested;
        }
      }
    } else if (value && typeof value === "object") {
      const nested = pickNestedString(value, keys);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function isQuoteAllowed(quote: MelhorEnvioQuote) {
  const allowedCompanies = parseAllowedList(env.MELHOR_ENVIO_ALLOWED_COMPANIES);
  const allowedServices = parseAllowedList(env.MELHOR_ENVIO_ALLOWED_SERVICES);
  const companyName = getQuoteCompanyName(quote);
  const serviceName = getQuoteServiceName(quote);
  const companyAllowed =
    allowedCompanies.length === 0 ||
    allowedCompanies.some((company) => companyName === company);
  const serviceAllowed =
    allowedServices.length === 0 ||
    allowedServices.some((service) => serviceName === service);

  return companyAllowed && serviceAllowed;
}

function quoteToOption(quote: MelhorEnvioQuote): ShippingOption | null {
  const price = getQuotePrice(quote);
  const estimatedDays = getQuoteDays(quote);

  if (price == null || estimatedDays == null) {
    return null;
  }

  return {
    method: `melhor-envio:${quote.id ?? quoteToLabel(quote)}`,
    label: quoteToLabel(quote),
    price,
    estimatedDays,
  };
}

function deduplicateQuotes(quotes: MelhorEnvioQuote[]) {
  const seen = new Set<string>();

  return quotes.filter((quote) => {
    const key = String(
      quote.id ?? `${quoteToLabel(quote)}-${quote.delivery_time}`,
    );

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildShippingOptions(quotes: MelhorEnvioQuote[]) {
  const validQuotes = deduplicateQuotes(
    quotes.filter(
      (quote) =>
        !quote.error &&
        isQuoteAllowed(quote) &&
        getQuotePrice(quote) != null &&
        getQuoteDays(quote) != null,
    ),
  );

  if (validQuotes.length === 0) {
    throw new Error(
      "Melhor Envio nao retornou opcoes de frete validas para este CEP.",
    );
  }

  const options = validQuotes
    .map(quoteToOption)
    .filter((option): option is ShippingOption => Boolean(option))
    .sort((a, b) => a.price - b.price || a.estimatedDays - b.estimatedDays);

  if (options.length === 0) {
    throw new Error("Melhor Envio nao retornou opcoes de frete validas.");
  }

  return options;
}

function getServiceId(method: string | null | undefined) {
  const melhorEnvioMatch = method?.match(/^melhor-envio:(\d+)$/);

  if (melhorEnvioMatch) {
    return Number(melhorEnvioMatch[1]);
  }

  if (method === "express") {
    return DEFAULT_EXPRESS_SERVICE_ID;
  }

  return env.MELHOR_ENVIO_DEFAULT_SERVICE_ID ?? DEFAULT_STANDARD_SERVICE_ID;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeDocument(document: string) {
  return document.replace(/\D/g, "");
}

function documentToMelhorEnvioPayload(document?: string | null) {
  const normalized = document ? normalizeDocument(document) : "";

  if (normalized.length === 11) {
    return { document: normalized };
  }

  if (normalized.length === 14) {
    return { company_document: normalized };
  }

  return {};
}

function addressToMelhorEnvioPayload(
  address: MelhorEnvioAddress,
  document?: string | null,
) {
  return {
    name: address.name,
    phone: normalizePhone(address.phone),
    email: address.email || undefined,
    ...documentToMelhorEnvioPayload(document),
    address: address.street,
    complement: address.complement || undefined,
    number: address.number,
    district: address.neighborhood,
    city: address.city,
    state_abbr: address.state.toUpperCase(),
    country_id: "BR",
    postal_code: normalizePostalCode(address.postalCode),
  };
}

function isLocalOrPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

function getPublicOrderUrl(cartId: string) {
  if (!env.NEXT_PUBLIC_URL) {
    return null;
  }

  try {
    const url = new URL("/dashboard/pedidos", env.NEXT_PUBLIC_URL);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      isLocalOrPrivateHostname(url.hostname)
    ) {
      return null;
    }

    url.searchParams.set("q", cartId);
    return url.toString();
  } catch {
    return null;
  }
}

function buildCartTags(cartId: string) {
  const orderUrl = getPublicOrderUrl(cartId);

  return [
    {
      tag: cartId,
      ...(orderUrl ? { url: orderUrl } : {}),
    },
  ];
}

function getShipmentPackage(input: MelhorEnvioShipmentInput) {
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const quantity = input.items.reduce((sum, item) => sum + item.quantity, 0);
  const packageItems = getPackageItems({
    postalCode: input.recipient.postalCode,
    quantity,
    subtotal,
    items: input.items,
  });
  const totalWeightKg = packageItems.reduce(
    (total, item) => total + item.weightKg * item.quantity,
    0,
  );

  return {
    subtotal,
    quantity,
    packageItems,
    volume: {
      height: Math.max(...packageItems.map((item) => item.heightCm)),
      width: Math.max(...packageItems.map((item) => item.widthCm)),
      length: Math.max(...packageItems.map((item) => item.lengthCm)),
      weight: Math.max(roundMoney(totalWeightKg), 0.01),
    },
  };
}

function buildCartPayload(input: MelhorEnvioShipmentInput) {
  const origin = getOriginAddress();
  const shipmentPackage = getShipmentPackage(input);

  return {
    service: getServiceId(input.method),
    from: addressToMelhorEnvioPayload(
      origin,
      env.MELHOR_ENVIO_ORIGIN_DOCUMENT ?? DEFAULT_ORIGIN_DOCUMENT,
    ),
    to: addressToMelhorEnvioPayload(input.recipient, input.recipient.document),
    products: input.items.map((item, index) => ({
      id: String(index + 1),
      name: item.name.slice(0, 120),
      quantity: Math.max(Math.round(item.quantity), 1),
      unitary_value: roundMoney(Math.max(item.unitPrice, 0)),
    })),
    volumes: [shipmentPackage.volume],
    options: {
      insurance_value: roundMoney(Math.max(shipmentPackage.subtotal, 0)),
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: true,
      platform: SITE_NAME,
      tags: buildCartTags(input.cartId),
    },
  };
}

async function melhorEnvioFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${getMelhorEnvioBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${requireMelhorEnvioToken()}`,
      "Content-Type": "application/json",
      "User-Agent": env.MELHOR_ENVIO_USER_AGENT ?? DEFAULT_USER_AGENT,
      ...init.headers,
    },
    cache: "no-store",
  });
  const data = await readMelhorEnvioResponse(response);

  if (!response.ok) {
    throw new Error(
      getMelhorEnvioHttpErrorMessage({
        data,
        path,
        status: response.status,
      }),
    );
  }

  return data;
}

function getOrderId(data: unknown) {
  return pickNestedString(data, [
    "id",
    "order_id",
    "order",
    "protocol",
    "purchase_id",
  ]);
}

function getTrackingCode(...sources: unknown[]) {
  for (const source of sources) {
    const code = pickNestedString(source, [
      "tracking",
      "tracking_code",
      "trackingCode",
      "codigo_rastreio",
      "codigoObjeto",
    ]);

    if (code) {
      return code;
    }
  }

  return null;
}

function getPrintUrl(data: unknown) {
  return pickNestedString(data, [
    "url",
    "link",
    "print_url",
    "label_url",
    "pdf",
  ]);
}

export async function createMelhorEnvioShipment(
  input: MelhorEnvioShipmentInput,
): Promise<MelhorEnvioShipmentResult> {
  assertMelhorEnvioTokenScopes(SHIPMENT_REQUIRED_SCOPES);

  const cartPayload = buildCartPayload(input);
  const rawCart = await melhorEnvioFetch("/api/v2/me/cart", {
    method: "POST",
    body: JSON.stringify(cartPayload),
  });
  const id = getOrderId(rawCart);

  if (!id) {
    throw new Error("Melhor Envio nao retornou o ID do envio.");
  }

  const rawCheckout = await melhorEnvioFetch("/api/v2/me/shipment/checkout", {
    method: "POST",
    body: JSON.stringify({
      orders: [id],
    }),
  });
  const rawGenerate = await melhorEnvioFetch("/api/v2/me/shipment/generate", {
    method: "POST",
    body: JSON.stringify({
      orders: [id],
    }),
  });
  const rawPrint = await melhorEnvioFetch("/api/v2/me/shipment/print", {
    method: "POST",
    body: JSON.stringify({
      mode: "public",
      orders: [id],
    }),
  });

  return {
    id,
    trackingCode: getTrackingCode(rawGenerate, rawCheckout, rawCart),
    labelRequestId: getPrintUrl(rawPrint),
    rawCart,
    rawCheckout,
    rawGenerate,
    rawPrint,
  };
}

export async function calculateMelhorEnvioShippingOptions({
  postalCode,
  quantity,
  subtotal,
  items,
}: ShippingCalculationInput) {
  const packageItems = getPackageItems({
    postalCode,
    quantity,
    subtotal,
    items,
  });
  const insuranceValue = roundMoney(Math.max(subtotal, 0));
  const response = await fetch(
    `${getMelhorEnvioBaseUrl()}/api/v2/me/shipment/calculate`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${requireMelhorEnvioToken()}`,
        "Content-Type": "application/json",
        "User-Agent": env.MELHOR_ENVIO_USER_AGENT ?? DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({
        from: {
          postal_code: getOriginPostalCode(),
        },
        to: {
          postal_code: normalizePostalCode(postalCode),
        },
        products: packageItems.map((item, index) => ({
          id: String(index + 1),
          width: item.widthCm,
          height: item.heightCm,
          length: item.lengthCm,
          weight: item.weightKg,
          insurance_value: item.unitPrice,
          quantity: item.quantity,
        })),
        options: {
          insurance_value: insuranceValue,
          receipt: false,
          own_hand: false,
        },
      }),
      cache: "no-store",
    },
  );
  const data = await readMelhorEnvioResponse(response);

  if (!response.ok) {
    throw new Error(
      getMelhorEnvioHttpErrorMessage({
        data,
        path: "/api/v2/me/shipment/calculate",
        status: response.status,
      }),
    );
  }

  if (!Array.isArray(data)) {
    throw new Error("Resposta invalida do Melhor Envio.");
  }

  return buildShippingOptions(data as MelhorEnvioQuote[]);
}
