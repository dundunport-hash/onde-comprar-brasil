"use client";

import dynamic from "next/dynamic";

function BannerCarouselFallback() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-1 aspect-[1146/1373] w-full animate-pulse bg-surface sm:aspect-[1983/793] lg:aspect-[2192/480]"
    />
  );
}

function LgpdRequestFormFallback() {
  return (
    <div aria-hidden="true" className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-18 animate-pulse rounded-lg bg-background" />
        <div className="h-18 animate-pulse rounded-lg bg-background" />
      </div>
      <div className="h-18 animate-pulse rounded-lg bg-background" />
      <div className="h-36 animate-pulse rounded-lg bg-background" />
      <div className="h-11 w-44 animate-pulse rounded-lg bg-background" />
    </div>
  );
}

export const LazyBannerCarousel = dynamic(
  () => import("./BannerCarousel").then((mod) => mod.BannerCarousel),
  {
    loading: BannerCarouselFallback,
  },
);

export const LazyCookieConsentBanner = dynamic(
  () => import("./CookieConsentBanner").then((mod) => mod.CookieConsentBanner),
  {
    loading: () => null,
    ssr: false,
  },
);

export const LazyLgpdRequestForm = dynamic(
  () => import("./LgpdRequestForm").then((mod) => mod.LgpdRequestForm),
  {
    loading: LgpdRequestFormFallback,
    ssr: false,
  },
);
