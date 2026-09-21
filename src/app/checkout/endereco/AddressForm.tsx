"use client";

import { useActionState, useEffect } from "react";
import type { InputHTMLAttributes } from "react";
import { useToast } from "@/components/ToastProvider";
import { saveCheckoutAddress } from "./actions";
import type { CheckoutAddressState } from "./state";

type AddressFormProps = {
  initialState: CheckoutAddressState;
  stripeCheckoutSessionId?: string;
  mercadoPagoPaymentId?: string;
};

export function AddressForm({
  initialState,
  stripeCheckoutSessionId = "",
  mercadoPagoPaymentId = "",
}: AddressFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveCheckoutAddress,
    initialState,
  );
  const { showToast } = useToast();
  const successRedirectHref = mercadoPagoPaymentId
    ? `/checkout/sucesso?mp_payment_id=${encodeURIComponent(mercadoPagoPaymentId)}`
    : stripeCheckoutSessionId
      ? `/checkout/sucesso?session_id=${encodeURIComponent(stripeCheckoutSessionId)}`
      : "/checkout/pagamento";

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }

    showToast(state.message, "success");

    const timeoutId = setTimeout(() => {
      window.location.assign(successRedirectHref);
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [showToast, state.message, state.status, successRedirectHref]);

  return (
    <form action={formAction} className="grid min-w-0 gap-4">
      {stripeCheckoutSessionId && (
        <input
          type="hidden"
          name="stripeCheckoutSessionId"
          value={stripeCheckoutSessionId}
        />
      )}
      {mercadoPagoPaymentId && (
        <input
          type="hidden"
          name="mercadoPagoPaymentId"
          value={mercadoPagoPaymentId}
        />
      )}

      {state.message && (
        <div
          className={`rounded-lg border p-2 text-sm ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-danger bg-red-50 text-danger"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Field
          label="Nome completo"
          name="fullName"
          defaultValue={state.values.fullName}
          error={state.errors.fullName}
          autoComplete="name"
        />
        <Field
          label="CPF"
          name="document"
          defaultValue={state.values.document}
          error={state.errors.document}
          autoComplete="off"
          inputMode="numeric"
          maxLength={14}
          placeholder="00000000000"
        />
        <Field
          label="Telefone"
          name="phone"
          defaultValue={state.values.phone}
          error={state.errors.phone}
          autoComplete="tel"
          inputMode="tel"
          placeholder="11999999999"
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[0.8fr_minmax(0,2fr)_0.7fr]">
        <Field
          label="CEP"
          name="postalCode"
          defaultValue={state.values.postalCode}
          error={state.errors.postalCode}
          autoComplete="postal-code"
          inputMode="numeric"
          placeholder="01001000"
        />
        <Field
          label="Endereco"
          name="street"
          defaultValue={state.values.street}
          error={state.errors.street}
          autoComplete="address-line1"
        />
        <Field
          label="Numero"
          name="number"
          defaultValue={state.values.number}
          error={state.errors.number}
          autoComplete="address-line2"
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_0.55fr]">
        <Field
          label="Complemento"
          name="complement"
          defaultValue={state.values.complement}
          error={state.errors.complement}
          required={false}
        />
        <Field
          label="Bairro"
          name="neighborhood"
          defaultValue={state.values.neighborhood}
          error={state.errors.neighborhood}
        />
        <Field
          label="Cidade"
          name="city"
          defaultValue={state.values.city}
          error={state.errors.city}
          autoComplete="address-level2"
        />
        <Field
          label="UF"
          name="state"
          defaultValue={state.values.state}
          error={state.errors.state}
          autoComplete="address-level1"
          maxLength={2}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm leading-5 text-muted">
          O endereco fica vinculado ao carrinho atual.
        </p>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Salvando..." : "Salvar endereco"}
          </button>
        </div>
      </div>
    </form>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: keyof CheckoutAddressState["values"];
  error?: string;
};

function Field({ label, error, name, required = true, ...props }: FieldProps) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="text-sm font-medium text-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        className={`min-h-11 w-full min-w-0 max-w-full rounded-lg border bg-background px-3 py-2 text-base text-foreground outline-none transition focus:border-primary/10 focus:ring-2 focus:ring-primary/10  sm:text-sm ${
          error ? "border-danger" : "border-border"
        }`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
