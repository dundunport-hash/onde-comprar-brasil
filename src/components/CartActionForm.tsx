"use client";

import { useState, type FormHTMLAttributes } from "react";
import { useToast } from "./ToastProvider";

type CartActionFormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "action" | "onSubmit"
> & {
  action: (formData: FormData) => Promise<unknown>;
  successMessage: string;
};

export function CartActionForm({
  action,
  successMessage,
  children,
  ...props
}: CartActionFormProps) {
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  async function handleAction(formData: FormData) {
    setIsPending(true);

    try {
      await action(formData);
      showToast(successMessage);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o carrinho.",
        "error",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={handleAction} aria-busy={isPending} {...props}>
      {children}
    </form>
  );
}
