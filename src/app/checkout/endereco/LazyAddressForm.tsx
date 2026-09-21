"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AddressForm } from "./AddressForm";

type LazyAddressFormProps = ComponentProps<typeof AddressForm>;

function AddressFormFallback() {
  return (
    <div aria-hidden="true" className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[0.8fr_minmax(0,2fr)_0.7fr]">
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr_0.55fr]">
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
      </div>
      <div className="h-11 w-full animate-pulse rounded-lg bg-background sm:ml-auto sm:w-36" />
    </div>
  );
}

export const LazyAddressForm = dynamic<LazyAddressFormProps>(
  () => import("./AddressForm").then((mod) => mod.AddressForm),
  {
    loading: AddressFormFallback,
    ssr: false,
  },
);
