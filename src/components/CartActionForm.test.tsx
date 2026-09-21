import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartActionForm } from "./CartActionForm";
import { ToastProvider } from "./ToastProvider";

describe("CartActionForm", () => {
  it("shows a success toast after updating the cart", async () => {
    const action = vi.fn().mockResolvedValue(undefined);

    render(
      <ToastProvider>
        <CartActionForm action={action} successMessage="Produto adicionado.">
          <input type="hidden" name="productId" value="product-1" />
          <button type="submit">Adicionar</button>
        </CartActionForm>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(await screen.findByRole("status", { name: "" })).toHaveTextContent(
      "Produto adicionado.",
    );
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("shows an error toast when the update fails", async () => {
    const action = vi
      .fn()
      .mockRejectedValue(new Error("Estoque insuficiente."));

    render(
      <ToastProvider>
        <CartActionForm action={action} successMessage="Produto adicionado.">
          <button type="submit">Adicionar</button>
        </CartActionForm>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Estoque insuficiente.",
      );
    });
  });
});
