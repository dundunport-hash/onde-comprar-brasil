import { describe, expect, it } from "vitest";
import {
  getCheckoutAddressValues,
  normalizePhone,
  normalizePostalCode,
  validateCheckoutAddress,
} from "./address";

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
    state: "sp",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

describe("checkout address helpers", () => {
  it("normalizes phone and postal code digits", () => {
    expect(normalizePhone("(11) 99999-9999")).toBe("11999999999");
    expect(normalizePostalCode("01001-000")).toBe("01001000");
  });

  it("extracts normalized values from form data", () => {
    expect(
      getCheckoutAddressValues(
        buildAddressForm({
          fullName: " <strong>Maria</strong>   Silva ",
        }),
      ),
    ).toMatchObject({
      fullName: "Maria Silva",
      document: "93541134780",
      phone: "11999999999",
      postalCode: "01001000",
      state: "SP",
    });
  });

  it("validates required address fields", () => {
    const valid = validateCheckoutAddress(
      getCheckoutAddressValues(buildAddressForm()),
    );
    const invalid = validateCheckoutAddress(
      getCheckoutAddressValues(
        buildAddressForm({
          fullName: "",
          document: "11111111111",
          phone: "123",
          postalCode: "999",
          state: "Sao Paulo",
        }),
      ),
    );

    expect(valid.isValid).toBe(true);
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors).toMatchObject({
      fullName: "Informe o nome completo.",
      document: "Informe um CPF valido.",
      phone: "Informe um telefone com DDD.",
      postalCode: "Informe um CEP SOMENTE NÚMEROS com 8 digitos.",
      state: "Informe a UF com 2 letras.",
    });
  });
});
