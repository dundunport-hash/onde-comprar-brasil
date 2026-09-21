"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Store, Truck } from "lucide-react";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { calculateCartShipping, type ShippingCalculatorState } from "./actions";
import { useToast } from "@/components/ToastProvider";

type ShippingCalculatorCardProps = {
  initialState: ShippingCalculatorState;
};

export function ShippingCalculatorCard({
  initialState,
}: ShippingCalculatorCardProps) {
  const [state, formAction, isPending] = useActionState(
    calculateCartShipping,
    initialState,
  );
  const [fulfillmentMethod, setFulfillmentMethod] = useState(
    initialState.fulfillmentMethod,
  );
  const [isReplacingShipping, setIsReplacingShipping] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const stateSignatureRef = useRef(
    `${state.status}:${state.fulfillmentMethod}:${state.postalCode}:${state.selectedMethod}:${state.options.length}`,
  );
  const router = useRouter();
  const { showToast } = useToast();
  const hasAppliedShipping =
    fulfillmentMethod === "shipping" &&
    state.postalCode.length > 0 &&
    state.options.length > 0;
  const showShippingOptions = !hasAppliedShipping || isReplacingShipping;

  useEffect(() => {
    const stateSignature = `${state.status}:${state.fulfillmentMethod}:${state.postalCode}:${state.selectedMethod}:${state.options.length}`;
    const hasNewActionState = stateSignatureRef.current !== stateSignature;

    if (state.status !== "idle" && state.message) {
      showToast(state.message, state.status);
    }

    if (state.status === "success" && hasNewActionState) {
      router.refresh();
    }

    stateSignatureRef.current = stateSignature;
  }, [router, showToast, state]);

  function handleFulfillmentMethodChange(value: "pickup" | "shipping") {
    setFulfillmentMethod(value);

    if (value === "pickup") {
      formRef.current?.requestSubmit();
    } else {
      setIsReplacingShipping(true);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Calcular frete</h2>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 grid gap-4"
        onSubmit={() => {
          if (fulfillmentMethod === "shipping") {
            setIsReplacingShipping(false);
          }
        }}
      >
        <div className="grid gap-2">
          <span className="text-sm font-medium">Forma de recebimento</span>
          <div className="grid gap-2">
            <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <input
                type="radio"
                name="fulfillmentMethod"
                value="pickup"
                checked={fulfillmentMethod === "pickup"}
                onChange={() => handleFulfillmentMethodChange("pickup")}
                className="h-4 w-4"
              />
              <Store className="h-4 w-4 text-primary" aria-hidden="true" />
              Retirar na loja
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <input
                type="radio"
                name="fulfillmentMethod"
                value="shipping"
                checked={fulfillmentMethod === "shipping"}
                onChange={() => handleFulfillmentMethodChange("shipping")}
                className="h-4 w-4"
              />
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              Calcular frete
            </label>
          </div>
        </div>

        {fulfillmentMethod === "shipping" && (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="postalCode">
                CEP
              </label>
              <input
                id="postalCode"
                name="postalCode"
                inputMode="numeric"
                defaultValue={state.postalCode}
                placeholder="01001000"
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            {state.options.length > 0 && showShippingOptions && (
              <div className="grid gap-2">
                <span className="text-sm font-medium">Fretes disponiveis</span>
                <div className="grid gap-2">
                  {state.options.map((option) => (
                    <label
                      key={option.method}
                      className={`grid cursor-pointer gap-2 rounded-lg border px-3 py-3 text-sm transition ${
                        option.method === state.selectedMethod
                          ? "border-primary/10 bg-primary/5"
                          : "border-border bg-background hover:border-primary"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={option.method}
                            defaultChecked={
                              state.selectedMethod === option.method
                            }
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="wrap-break-word font-medium">
                            {option.label}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-primary">
                          {currencyFormatter.format(option.price)}
                        </span>
                      </div>
                      <span className="pl-6 text-xs text-muted">
                        Entrega estimada em {option.estimatedDays} dia
                        {option.estimatedDays === 1 ? "" : "s"} uteis.
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {fulfillmentMethod === "pickup" && (
          <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Retirada na loja ativada. Voce retira o pedido na loja e o frete nao
            sera cobrado.
          </p>
        )}

        {hasAppliedShipping && !showShippingOptions && (
          <button
            type="button"
            className="rounded-lg border border-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            onClick={() => setIsReplacingShipping(true)}
          >
            Substituir frete
          </button>
        )}

        {fulfillmentMethod !== "pickup" && showShippingOptions && (
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Calculando..."
              : state.options.length > 0
                ? "Aplicar frete selecionado"
                : "Calcular fretes"}
          </button>
        )}
      </form>

      {state.message && (
        <p
          className={`mt-3 rounded-lg border p-3 text-sm ${
            state.status === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-danger bg-red-50 text-danger"
          }`}
        >
          {state.message}
        </p>
      )}

      {fulfillmentMethod === "shipping" && state.options.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          Informe o CEP SOMENTE NÚMEROSpara carregar as opcoes disponiveis.
        </p>
      )}
    </section>
  );
}
