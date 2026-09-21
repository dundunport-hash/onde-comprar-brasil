"use client";

import { useState } from "react";
import Image from "next/image";
import { Save } from "lucide-react";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import type { HeroBannerDevice, HeroBannerSlot } from "@/lib/hero-banners";
import { patchHeroBanner } from "./actions";

const deviceLabels: Record<HeroBannerDevice, string> = {
  desktop: "desktop",
  tablet: "tablet",
  mobile: "celular",
};

const recommendedDimensions: Record<HeroBannerDevice, string> = {
  desktop: "2192 x 480 px",
  tablet: "1983 x 793 px",
  mobile: "1536 x 1024 px",
};

type BannerSlotFormProps = {
  banner: HeroBannerSlot;
};

export function BannerSlotForm({ banner }: BannerSlotFormProps) {
  const [src, setSrc] = useState<string>(banner.src);

  return (
    <form
      id={`${banner.device}-${banner.slot}`}
      action={patchHeroBanner}
      className="grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      <input type="hidden" name="device" value={banner.device} />
      <input type="hidden" name="slot" value={banner.slot} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            Banner {banner.slot} - {deviceLabels[banner.device]}
          </h3>
          <p className="mt-1 text-xs text-muted">
            Dimensao recomendada: {recommendedDimensions[banner.device]}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted">
          <input
            type="checkbox"
            name="active"
            defaultChecked={banner.active}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          Ativo
        </label>
      </div>

      <CloudinaryUpload
        inputName="src"
        value={src}
        label={`Enviar banner ${deviceLabels[banner.device]}`}
        previewAlt={`Banner ${banner.slot} para ${deviceLabels[banner.device]}`}
        folder="banners"
        accept="image/*"
        helperText="Imagem JPG, PNG, WebP ou GIF. Use a dimensao recomendada acima."
        mediaLabel="banner"
        onChange={(url) => setSrc(url ?? "")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Largura (px)
          <input
            name="width"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={banner.width}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Altura (px)
          <input
            name="height"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={banner.height}
            className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
          />
        </label>
      </div>

      <div className="relative aspect-3/1 overflow-hidden rounded-lg border border-border bg-background">
        <Image
          src={src}
          alt={`Previa do banner ${banner.slot}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-contain"
          loading="eager"
        />
      </div>

      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        Atualizar banner
      </button>
    </form>
  );
}
