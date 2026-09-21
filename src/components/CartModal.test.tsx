import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartModal } from "./CartModal";

describe("CartModal", () => {
  it("opens and closes the cart modal", async () => {
    render(
      <CartModal itemCount={2}>
        <p>Conteudo do carrinho</p>
      </CartModal>,
    );

    expect(screen.queryByText("Conteudo do carrinho")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abrir carrinho" }));

    expect(
      await screen.findByRole("dialog", { name: "Carrinho" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Conteudo do carrinho")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar modal" }));

    expect(screen.queryByText("Conteudo do carrinho")).not.toBeInTheDocument();
  });

  it("closes the cart modal when the checkout login link is clicked", async () => {
    render(
      <CartModal itemCount={1}>
        <a href="/login?callbackUrl=/checkout/pagamento">
          Fazer login para finalizar a compra
        </a>
      </CartModal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir carrinho" }));

    expect(
      await screen.findByRole("dialog", { name: "Carrinho" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("link", {
        name: "Fazer login para finalizar a compra",
      }),
    );

    expect(
      screen.queryByRole("dialog", { name: "Carrinho" }),
    ).not.toBeInTheDocument();
  });
});
