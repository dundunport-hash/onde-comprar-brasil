import { normalizePostalCode } from "@/lib/address";
import { calculateMelhorEnvioShippingOptions } from "@/lib/melhor-envio";
import { roundMoney } from "@/lib/pricing";

export type ShippingMethod = string;
export const PICKUP_SHIPPING_METHOD = "pickup";
export const PICKUP_SHIPPING_LABEL = "Retirada na loja";

export function isPickupShippingMethod(method: string | null | undefined) {
  return method === PICKUP_SHIPPING_METHOD;
}

export function isDeliveryShippingMethod(
  method: string | null | undefined,
): method is ShippingMethod {
  return Boolean(method) && !isPickupShippingMethod(method);
}

export type ShippingOption = {
  method: ShippingMethod;
  label: string;
  price: number;
  estimatedDays: number;
};

export type ShippingPackageItem = {
  quantity: number;
  unitPrice: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
};

export type ShippingCalculationInput = {
  postalCode: string;
  subtotal: number;
  quantity: number;
  items?: ShippingPackageItem[];
};

type RegionRule = {
  firstDigits: string[];
  surcharge: number;
  estimatedDays: number;
};

const regionRules: RegionRule[] = [
  { firstDigits: ["0", "1"], surcharge: 0, estimatedDays: 2 },
  { firstDigits: ["2", "3"], surcharge: 4, estimatedDays: 3 },
  { firstDigits: ["4", "5"], surcharge: 8, estimatedDays: 5 },
  { firstDigits: ["6", "7"], surcharge: 12, estimatedDays: 7 },
  { firstDigits: ["8", "9"], surcharge: 16, estimatedDays: 8 },
];

export function validateShippingPostalCode(postalCode: string) {
  const normalizedPostalCode = normalizePostalCode(postalCode);

  return {
    postalCode: normalizedPostalCode,
    isValid: normalizedPostalCode.length === 8,
    error:
      normalizedPostalCode.length === 8
        ? ""
        : "Informe um CEP SOMENTE NÚMEROS com 8 digitos.",
  };
}

function getRegionRule(postalCode: string) {
  const firstDigit = postalCode[0];

  return (
    regionRules.find((rule) => rule.firstDigits.includes(firstDigit)) ??
    regionRules[regionRules.length - 1]
  );
}

export function calculateShippingOptions({
  postalCode,
  quantity,
}: ShippingCalculationInput) {
  const validation = validateShippingPostalCode(postalCode);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const regionRule = getRegionRule(validation.postalCode);
  const volumeFee = Math.max(quantity, 1) * 1.5;
  const standardBasePrice = 12 + regionRule.surcharge + volumeFee;
  const standardPrice = roundMoney(standardBasePrice);
  const expressPrice = roundMoney(standardBasePrice + 12.9);

  return [
    {
      method: "standard",
      label: "Entrega padrao",
      price: standardPrice,
      estimatedDays: regionRule.estimatedDays,
    },
    {
      method: "express",
      label: "Entrega expressa",
      price: expressPrice,
      estimatedDays: Math.max(regionRule.estimatedDays - 2, 1),
    },
  ] satisfies ShippingOption[];
}

export async function calculateShippingOptionsWithProviders(
  input: ShippingCalculationInput,
) {
  const validation = validateShippingPostalCode(input.postalCode);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  return calculateMelhorEnvioShippingOptions({
    ...input,
    postalCode: validation.postalCode,
  });
}

export function findShippingOption(
  options: ShippingOption[],
  method: string | null,
) {
  return options.find((option) => option.method === method) ?? options[0];
}
