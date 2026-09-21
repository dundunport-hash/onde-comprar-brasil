import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ToastProvider";
import { CopyPixPaymentLinkButton } from "./CopyPixPaymentLinkButton";

describe("CopyPixPaymentLinkButton", () => {
  it("copies the Pix payment link to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });

    render(
      <ToastProvider>
        <CopyPixPaymentLinkButton paymentUrl="https://example.com/pix" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Copiar link Pix/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("https://example.com/pix");
      expect(screen.getByRole("button", { name: /Link copiado/i }));
    });
  });
});
