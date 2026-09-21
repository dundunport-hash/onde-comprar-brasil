import { sanitizeText } from "@/lib/sanitize";

export type CheckoutAddressValues = {
  fullName: string;
  document: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type CheckoutAddressErrors = Partial<
  Record<keyof CheckoutAddressValues, string>
>;

export const emptyCheckoutAddressValues: CheckoutAddressValues = {
  fullName: "",
  document: "",
  phone: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

const statePattern = /^[A-Z]{2}$/;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeText(value: FormDataEntryValue | string | null) {
  return sanitizeText(value, { maxLength: 120 });
}

export function normalizePostalCode(value: string) {
  return onlyDigits(value);
}

export function normalizePhone(value: string) {
  return onlyDigits(value);
}

export function normalizeCpf(value: string) {
  return onlyDigits(value);
}

export function isValidCpf(value: string) {
  const cpf = normalizeCpf(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split("").map(Number);

  const firstCheck = digits
    .slice(0, 9)
    .reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstRemainder = (firstCheck * 10) % 11;
  const firstDigit = firstRemainder === 10 ? 0 : firstRemainder;

  if (firstDigit !== digits[9]) {
    return false;
  }

  const secondCheck = digits
    .slice(0, 10)
    .reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondRemainder = (secondCheck * 10) % 11;
  const secondDigit = secondRemainder === 10 ? 0 : secondRemainder;

  return secondDigit === digits[10];
}

export function getCheckoutAddressValues(formData: FormData) {
  return {
    fullName: normalizeText(formData.get("fullName")),
    document: normalizeCpf(normalizeText(formData.get("document"))),
    phone: normalizePhone(normalizeText(formData.get("phone"))),
    postalCode: normalizePostalCode(normalizeText(formData.get("postalCode"))),
    street: normalizeText(formData.get("street")),
    number: normalizeText(formData.get("number")),
    complement: normalizeText(formData.get("complement")),
    neighborhood: normalizeText(formData.get("neighborhood")),
    city: normalizeText(formData.get("city")),
    state: normalizeText(formData.get("state")).toUpperCase(),
  };
}

export function validateCheckoutAddress(values: CheckoutAddressValues) {
  const errors: CheckoutAddressErrors = {};

  if (values.fullName.length < 3) {
    errors.fullName = "Informe o nome completo.";
  }

  if (!isValidCpf(values.document)) {
    errors.document = "Informe um CPF valido.";
  }

  if (values.phone.length < 10 || values.phone.length > 11) {
    errors.phone = "Informe um telefone com DDD.";
  }

  if (values.postalCode.length !== 8) {
    errors.postalCode = "Informe um CEP SOMENTE NÚMEROS com 8 digitos.";
  }

  if (values.street.length < 3) {
    errors.street = "Informe o logradouro.";
  }

  if (!values.number) {
    errors.number = "Informe o numero.";
  }

  if (values.neighborhood.length < 2) {
    errors.neighborhood = "Informe o bairro.";
  }

  if (values.city.length < 2) {
    errors.city = "Informe a cidade.";
  }

  if (!statePattern.test(values.state)) {
    errors.state = "Informe a UF com 2 letras.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
