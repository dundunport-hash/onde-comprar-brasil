import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShippingCalculatorCard } from "./ShippingCalculatorCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe("ShippingCalculatorCard", () => {
  it("hides the pickup selection button when pickup is already selected", () => {
    render(
      <ShippingCalculatorCard
        initialState={{
          status: "idle",
          message: "",
          fulfillmentMethod: "pickup",
          postalCode: "",
          selectedMethod: "standard",
          options: [],
        }}
      />,
    );

    expect(screen.queryByText(/Selecionar retirada na loja/i)).toBeNull();
    expect(screen.getByText(/Retirada na loja ativada/i)).toBeInTheDocument();
  });

  it("hides applied shipping options until the user chooses to replace shipping", async () => {
    render(
      <ShippingCalculatorCard
        initialState={{
          status: "success",
          message: "Frete aplicado.",
          fulfillmentMethod: "shipping",
          postalCode: "01001000",
          selectedMethod: "express",
          options: [
            {
              method: "express",
              label: "PAC",
              price: 20,
              estimatedDays: 3,
            },
          ],
        }}
      />,
    );

    expect(screen.queryByText(/Aplicar frete selecionado/i)).toBeNull();
    expect(screen.queryByText("PAC")).toBeNull();

    fireEvent.click(screen.getByText(/Substituir frete/i));

    await waitFor(() => {
      expect(screen.getByText("PAC")).toBeInTheDocument();
      expect(
        screen.getByText(/Aplicar frete selecionado/i),
      ).toBeInTheDocument();
    });
  });
});
