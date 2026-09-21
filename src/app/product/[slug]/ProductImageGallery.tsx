"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package, Play } from "lucide-react";

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

function isVideoUrl(url: string) {
  const path = url.toLowerCase().split(/[?#]/)[0];
  return path.includes("/video/upload/") || /\.(mp4|webm|mov|m4v)$/.test(path);
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const media = [...new Set(images.filter(Boolean))];
  const [selected, setSelected] = useState(0);
  const [failedMedia, setFailedMedia] = useState<string[]>([]);
  const current = selected < media.length ? selected : 0;
  const source = media[current];
  const failed = source && failedMedia.includes(source);
  const move = (direction: number) =>
    setSelected((current + direction + media.length) % media.length);
  const markFailed = () => setFailedMedia((previous) => [...previous, source]);
  const controlClass =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <section
      aria-label={`Galeria de ${productName}`}
      className="grid min-w-0 gap-4"
    >
      <div className="relative aspect-square min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
        {!source || failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted">
            <Package className="h-12 w-12" aria-hidden="true" />
            {failed
              ? "Não foi possível carregar esta mídia."
              : "Sem imagem cadastrada"}
          </div>
        ) : isVideoUrl(source) ? (
          <video
            key={source}
            src={source}
            aria-label={`Vídeo de ${productName}`}
            className="h-full w-full object-contain p-4"
            controls
            playsInline
            preload="metadata"
            onError={markFailed}
          />
        ) : (
          <Image
            key={source}
            src={source}
            alt={`${productName} — imagem ${current + 1}`}
            fill
            sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, 100vw"
            className="object-contain p-5 sm:p-8"
            loading="eager"
            onError={markFailed}
          />
        )}
      </div>
      {media.length > 1 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={controlClass}
              onClick={() => move(-1)}
              aria-label="Mídia anterior"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </button>
            <p
              aria-live="polite"
              aria-atomic="true"
              className="text-sm text-muted"
            >
              {current + 1} de {media.length}
            </p>
            <button
              type="button"
              className={controlClass}
              onClick={() => move(1)}
              aria-label="Próxima mídia"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div
            className="flex gap-3 overflow-x-auto p-1"
            aria-label="Selecionar mídia"
          >
            {media.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver ${isVideoUrl(url) ? "vídeo" : "imagem"} ${index + 1} de ${productName}`}
                aria-pressed={current === index}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${current === index ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"}`}
              >
                {isVideoUrl(url) ? (
                  <Play
                    className="mx-auto h-6 w-6 text-primary"
                    aria-hidden="true"
                  />
                ) : failedMedia.includes(url) ? (
                  <Package
                    className="mx-auto h-6 w-6 text-muted"
                    aria-hidden="true"
                  />
                ) : (
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
