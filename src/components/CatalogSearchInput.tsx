"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 500;

export function CatalogSearchInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (value === currentQuery) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      const trimmedValue = value.trim();

      if (trimmedValue) {
        params.set("q", trimmedValue);
      } else {
        params.delete("q");
      }

      params.delete("page");

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [currentQuery, pathname, router, searchParams, value]);

  return (
    <input
      id="q"
      name="q"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      type="search"
      placeholder="Buscar no catálogo"
      className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:text-sm"
    />
  );
}
