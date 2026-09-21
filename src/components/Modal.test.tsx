import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("moves focus inside the modal and restores it when closed", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Abrir carrinho</button>
      </>,
    );

    const trigger = screen.getByRole("button", { name: "Abrir carrinho" });
    trigger.focus();

    rerender(
      <>
        <button type="button">Abrir carrinho</button>
        <Modal isOpen onClose={onClose} title="Carrinho">
          <button type="button">Finalizar compra</button>
        </Modal>
      </>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Fechar modal" }),
      ).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <button type="button">Abrir carrinho</button>
        <Modal isOpen={false} onClose={onClose} title="Carrinho">
          <button type="button">Finalizar compra</button>
        </Modal>
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Abrir carrinho" }),
    ).toHaveFocus();
  });

  it("keeps keyboard tab navigation inside the modal", async () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Carrinho">
        <button type="button">Primeira acao</button>
        <button type="button">Segunda acao</button>
      </Modal>,
    );

    const closeButton = await screen.findByRole("button", {
      name: "Fechar modal",
    });
    const secondAction = screen.getByRole("button", { name: "Segunda acao" });

    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(secondAction).toHaveFocus();

    secondAction.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });
});
