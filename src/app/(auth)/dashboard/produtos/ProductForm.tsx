"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { useToast } from "@/components/ToastProvider";

type CategoryOption = {
  id: string;
  name: string;
};

type ProductFormValues = {
  name: string;
  description: string | null;
  technicalData: string | null;
  imageUrl: string | null;
  imageUrl2: string | null;
  imageUrl3: string | null;
  ean: string | null;
  price: number;
  stock: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  active: boolean;
  categoryId: string | null;
};

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: CategoryOption[];
  product?: ProductFormValues;
  submitLabel: string;
};

function formatPriceInput(price?: number) {
  if (price === undefined) {
    return "";
  }

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatNumberInput(value: number | undefined, fallback: number) {
  return String(value ?? fallback);
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function ProductForm({
  action,
  categories,
  product,
  submitLabel,
}: ProductFormProps) {
  const [uploadingFields, setUploadingFields] = useState<
    Record<string, boolean>
  >({});
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({
    imageUrl: product?.imageUrl ?? null,
    imageUrl2: product?.imageUrl2 ?? null,
    imageUrl3: product?.imageUrl3 ?? null,
  });
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const { showToast } = useToast();
  const isUploading = Object.values(uploadingFields).some(Boolean);

  function setUploading(field: string, isFieldUploading: boolean) {
    setUploadingFields((current) => ({
      ...current,
      [field]: isFieldUploading,
    }));
  }

  function setImageUrl(field: string, value: string | null) {
    setImageUrls((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const imageFields = [
    {
      name: "imageUrl",
      label: "Midia principal",
      value: imageUrls.imageUrl,
    },
    {
      name: "imageUrl2",
      label: "Midia 2",
      value: imageUrls.imageUrl2,
    },
    {
      name: "imageUrl3",
      label: "Midia 3",
      value: imageUrls.imageUrl3,
    },
  ];

  async function handleAction(formData: FormData) {
    setFeedback(null);
    setIsPending(true);

    try {
      await action(formData);
      const message = product
        ? "Produto atualizado com sucesso."
        : "Produto cadastrado com sucesso.";
      setFeedback({ type: "success", message });
      showToast(message);
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o produto.";
      setFeedback({ type: "error", message });
      showToast(message, "error");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form action={handleAction} className="grid gap-5" aria-busy={isPending}>
      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
            feedback.type === "error"
              ? "border-red-200 bg-red-50 text-danger"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {feedback.type === "error" ? (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="name">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={product?.name ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="description"
        >
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={10}
          defaultValue={product?.description ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
        />
      </div>

      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-foreground"
          htmlFor="technicalData"
        >
          Dados tecnicos
        </label>
        <textarea
          id="technicalData"
          name="technicalData"
          rows={10}
          defaultValue={product?.technicalData ?? ""}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="price"
          >
            Preço
          </label>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            defaultValue={formatPriceInput(product?.price)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="ean">
            Codigo EAN/EAM
          </label>
          <input
            id="ean"
            name="ean"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={product?.ean ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-sm font-medium text-foreground">Logistica</h2>

        <div className="grid gap-5 md:grid-cols-4">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="lengthCm"
            >
              Comprimento (cm)
            </label>
            <input
              id="lengthCm"
              name="lengthCm"
              required
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              defaultValue={formatNumberInput(product?.lengthCm, 20)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="widthCm"
            >
              Largura (cm)
            </label>
            <input
              id="widthCm"
              name="widthCm"
              required
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              defaultValue={formatNumberInput(product?.widthCm, 16)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="heightCm"
            >
              Altura (cm)
            </label>
            <input
              id="heightCm"
              name="heightCm"
              required
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              defaultValue={formatNumberInput(product?.heightCm, 5)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="weightKg"
            >
              Peso (kg)
            </label>
            <input
              id="weightKg"
              name="weightKg"
              required
              type="number"
              min="0.1"
              step="0.1"
              inputMode="decimal"
              defaultValue={formatNumberInput(product?.weightKg, 0.5)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="stock"
          >
            Estoque
          </label>
          <input
            id="stock"
            name="stock"
            required
            type="number"
            min="0"
            step="1"
            defaultValue={product?.stock ?? 0}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          />
        </div>

        {!product && (
          <div className="grid gap-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="initialDiscountPercent"
            >
              Desconto inicial (%)
            </label>
            <input
              id="initialDiscountPercent"
              name="initialDiscountPercent"
              type="number"
              min="0"
              max="100"
              step="1"
              inputMode="decimal"
              defaultValue="0"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="categoryId"
          >
            Categoria
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Midias</h2>
          <p className="text-xs text-muted">
            Envie imagens ou videos do computador. O link e preenchido
            automaticamente apos o upload.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {imageFields.map((field) => (
            <div key={field.name} className="grid gap-2">
              <span className="text-sm font-medium text-foreground">
                {field.label}
              </span>
              <CloudinaryUpload
                inputName={field.name}
                value={field.value}
                label={`Enviar ${field.label.toLowerCase()}`}
                previewAlt={field.label}
                folder="drogaria-mega-popular"
                accept="image/*,video/*"
                helperText="Imagem JPG, PNG, WebP ou GIF ate 3 MB. Video MP4, WebM ou MOV ate 50 MB."
                mediaLabel="midia"
                onChange={(url) => setImageUrl(field.name, url)}
                onUploadingChange={(isFieldUploading) =>
                  setUploading(field.name, isFieldUploading)
                }
              />
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium text-foreground">
        <input
          name="active"
          type="checkbox"
          defaultChecked={product?.active ?? true}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        Produto ativo
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isUploading || isPending}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-background transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading
            ? "Aguarde o upload..."
            : isPending
              ? "Salvando..."
              : submitLabel}
        </button>
        <Link
          href="/dashboard/produtos"
          className="rounded-lg bg-secondary px-5 py-2 font-medium text-foreground transition hover:bg-secondary/90"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
