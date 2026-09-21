import { SITE_NAME } from "@/lib/store-contact";
import Link from "next/link";
import { Search, ChevronDown } from "lucide-react";
import { Navbar } from "./Navbar";

import Image from "next/image";

export default function Nav() {
  return (
    <div className="flex  flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-2 py-2 sm:px-2 lg:gap-x-3 lg:gap-y-1 lg:px-2">
          <Link
            href="/"
            className="flex min-w-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label={`${SITE_NAME} - inicio`}
          >
            <Image
              src="/logo2.png"
              alt={SITE_NAME}
              width={2172}
              height={724}
              preload
              className="h-12 w-auto max-w-48 object-contain sm:h-26 sm:max-w-[18rem] lg:max-w-76"
            />
          </Link>

          <form
            action="/"
            method="get"
            role="search"
            aria-label="Buscar produtos na loja"
            className="order-last col-span-3 flex min-w-0 overflow-hidden rounded-2xl border border-[#a7cbc4] bg-surface text-foreground shadow-sm lg:order-0 lg:col-span-1"
          >
            <label htmlFor="store-search" className="sr-only">
              Buscar produtos
            </label>
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2">
              <Search
                className="h-5 w-5 shrink-0 text-muted"
                aria-hidden="true"
              />
              <input
                id="store-search"
                name="q"
                type="search"
                placeholder="O que voce esta procurando?"
                className="min-h-12 w-full min-w-0 bg-surface text-sm font-semibold outline-none placeholder:text-[#8190a6]"
              />
            </div>
            <div className="hidden min-h-12 items-center gap-2 border-l border-border px-4 text-xs font-black text-foreground md:flex">
              categorias
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </div>
            <button
              type="submit"
              aria-label="Buscar"
              className="flex min-h-12 shrink-0 items-center justify-center gap-2 bg-primary px-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </form>
          <Navbar />
        </div>
      </header>
    </div>
  );
}
