import type { Metadata } from "next";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import {
  HERO_BANNER_DEVICES,
  getDashboardHeroBanners,
  type HeroBannerDevice,
} from "@/lib/hero-banners";
import { SITE_NAME } from "@/lib/store-contact";
import { BannerSlotForm } from "./BannerSlotForm";

export const metadata: Metadata = {
  title: `Banners da hero | Dashboard ${SITE_NAME}`,
  description:
    "Atualize os banners responsivos do carrossel da pagina inicial.",
  robots: {
    index: false,
    follow: false,
  },
};

type DashboardBannersSearchParams = {
  updated?: string | string[];
};

const sectionLabels: Record<HeroBannerDevice, string> = {
  desktop: "Banners para desktop",
  tablet: "Banners para tablet",
  mobile: "Banners para celulares",
};

const sectionDescriptions: Record<HeroBannerDevice, string> = {
  desktop: "10 imagens usadas em telas grandes. Recomendado: 2192 x 480 px.",
  tablet: "10 imagens usadas em tablets. Recomendado: 1983 x 793 px.",
  mobile: "10 imagens usadas em celulares. Recomendado: 1536 x 1024 px.",
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardBannersPage({
  searchParams,
}: {
  searchParams: Promise<DashboardBannersSearchParams>;
}) {
  await requireAdminSession();
  const [bannerGroups, query] = await Promise.all([
    getDashboardHeroBanners(),
    searchParams,
  ]);
  const wasUpdated = getSingleParam(query.updated) === "1";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Banners do carrossel
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Atualize os 10 banners de desktop, tablet e celular. Cada slot e
            salvo individualmente por patch e substitui a imagem correspondente
            no carrossel da pagina inicial.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-primary/10 hover:text-primary"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Ver carrossel
        </Link>
      </div>

      {wasUpdated && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          Banner atualizado com sucesso.
        </div>
      )}

      <div className="mt-8 grid gap-10">
        {HERO_BANNER_DEVICES.map((device) => (
          <section key={device} className="grid gap-4">
            <div>
              <h2 className="text-xl font-semibold">{sectionLabels[device]}</h2>
              <p className="mt-1 text-sm text-muted">
                {sectionDescriptions[device]}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {bannerGroups[device].map((banner) => (
                <BannerSlotForm
                  key={`${banner.device}-${banner.slot}`}
                  banner={banner}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
