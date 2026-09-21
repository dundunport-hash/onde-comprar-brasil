"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ShippingCalculatorCard } from "./ShippingCalculatorCard";

type LazyShippingCalculatorCardProps = ComponentProps<
  typeof ShippingCalculatorCard
>;

function ShippingCalculatorFallback() {
  return (
    <section
      aria-hidden="true"
      className="rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      <div className="h-6 w-36 animate-pulse rounded bg-background" />
      <div className="mt-4 grid gap-4">
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-24 animate-pulse rounded-lg bg-background" />
        <div className="h-11 animate-pulse rounded-lg bg-background" />
      </div>
    </section>
  );
}

export const LazyShippingCalculatorCard =
  dynamic<LazyShippingCalculatorCardProps>(
    () =>
      import("./ShippingCalculatorCard").then(
        (mod) => mod.ShippingCalculatorCard,
      ),
    {
      loading: ShippingCalculatorFallback,
      ssr: false,
    },
  );
