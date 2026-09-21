"use client";

import { useState } from "react";
import { FileText, ImagePlus, Video, X } from "lucide-react";
import { useCloudinaryUpload } from "@/hooks/useCloudinaryUpload";

interface CloudinaryUploadProps {
  value?: string | null;
  inputName?: string;
  label?: string;
  previewAlt?: string;
  onSuccess?: (url: string, publicId: string) => void;
  onChange?: (url: string | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  folder?: string;
  accept?: string;
  helperText?: string;
  mediaLabel?: string;
}

export function CloudinaryUpload({
  value,
  inputName,
  label = "Escolher imagem",
  previewAlt = "Previa da imagem",
  onSuccess,
  onChange,
  onUploadingChange,
  folder = "drogaria-mega-popular",
  accept = "image/*",
  helperText = "JPG, PNG, WebP ou GIF ate 3 MB",
  mediaLabel = "imagem",
}: CloudinaryUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [internalUrl, setInternalUrl] = useState<string | null>(value ?? null);
  const { isLoading, error, upload, reset } = useCloudinaryUpload();
  const isControlled = value !== undefined;
  const currentUrl = isControlled ? value : internalUrl;
  const displayUrl = currentUrl ?? preview;
  const isPdf =
    previewType === "application/pdf" ||
    Boolean(displayUrl?.toLowerCase().split("?")[0]?.endsWith(".pdf"));
  const isVideo =
    previewType?.startsWith("video/") ||
    Boolean(
      displayUrl
        ?.toLowerCase()
        .split("?")[0]
        ?.match(/\.(mp4|webm|mov|m4v)$/),
    ) ||
    Boolean(displayUrl?.includes("/video/upload/"));

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreviewType(file.type);
    if (file.type === "application/pdf" || file.type.startsWith("video/")) {
      setPreview(null);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    onUploadingChange?.(true);
    try {
      const result = await upload(file, folder);
      if (result) {
        setInternalUrl(result.url);
        setPreview(null);
        setPreviewType(file.type);
        onChange?.(result.url);
        onSuccess?.(result.url, result.publicId);
      }
    } finally {
      onUploadingChange?.(false);
    }
  };

  function clearImage() {
    reset();
    setInternalUrl(null);
    setPreview(null);
    setPreviewType(null);
    onChange?.(null);
  }

  return (
    <div className="space-y-4">
      {inputName ? (
        <input type="hidden" name={inputName} value={currentUrl ?? ""} />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        {displayUrl ? (
          <div className="relative h-40 w-full">
            {isPdf ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-surface px-4 text-center">
                <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">
                  PDF anexado
                </span>
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Abrir arquivo
                </a>
              </div>
            ) : isVideo ? (
              <video
                src={displayUrl}
                className="h-full w-full object-cover"
                controls
                muted
                playsInline
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt={previewAlt}
                  className="h-full w-full object-cover"
                />
              </>
            )}
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-sm transition hover:bg-background"
              aria-label={`Remover ${mediaLabel}`}
              title={`Remover ${mediaLabel}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-border bg-background/50 text-center transition hover:bg-surface">
            {accept.includes("video") ? (
              <Video className="h-7 w-7 text-primary" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-7 w-7 text-primary" aria-hidden="true" />
            )}
            <span className="px-3 text-sm font-medium text-foreground">
              {isLoading ? "Enviando..." : label}
            </span>
            <span className="px-3 text-xs text-muted">{helperText}</span>
            <input
              type="file"
              className="sr-only"
              accept={accept}
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        )}

        {displayUrl ? (
          <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-border px-3 py-2 text-sm font-medium text-primary transition hover:bg-surface">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {isLoading ? "Enviando..." : `Trocar ${mediaLabel}`}
            <input
              type="file"
              className="sr-only"
              accept={accept}
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        ) : null}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
