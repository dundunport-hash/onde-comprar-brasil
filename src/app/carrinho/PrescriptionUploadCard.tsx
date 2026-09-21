"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, Store } from "lucide-react";
import { CloudinaryUpload } from "@/components/CloudinaryUpload";
import { useToast } from "@/components/ToastProvider";
import { saveControlledMedicationPrescription } from "./actions";

type PrescriptionUploadCardProps = {
  value: string | null;
};

export function PrescriptionUploadCard({ value }: PrescriptionUploadCardProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showToast } = useToast();

  function savePrescription(url: string | null) {
    const formData = new FormData();
    formData.set("prescriptionImageUrl", url ?? "");

    startTransition(async () => {
      try {
        await saveControlledMedicationPrescription(formData);
        setCurrentValue(url);
        router.refresh();
        showToast(
          url ? "Receita anexada ao carrinho." : "Receita removida.",
          "success",
        );
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a receita.",
          "error",
        );
      }
    });
  }

  return (
    <section className="rounded-lg border border-warning bg-yellow-50 p-5 text-warning shadow-sm">
      <div className="flex items-start gap-3">
        <Store className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-foreground">
            Retirada obrigatoria na loja
          </h2>
          <p className="mt-1 text-sm">
            Medicamentos controlados so podem ser vendidos com receita e
            retirados presencialmente.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileImage className="h-4 w-4 text-primary" aria-hidden="true" />
          Receita medica
        </div>
        <CloudinaryUpload
          value={currentValue}
          label={isPending ? "Salvando receita..." : "Anexar receita"}
          previewAlt="Receita medica anexada"
          folder="receitas"
          accept="image/*,application/pdf"
          helperText="JPG, PNG, WebP, GIF ou PDF ate 3 MB"
          onSuccess={(url) => savePrescription(url)}
          onChange={(url) => {
            if (!url) {
              savePrescription(null);
            }
          }}
        />
        <p className="mt-2 text-xs leading-5 text-warning">
          Envie uma foto legivel ou PDF da receita. O atendimento confirmara os
          dados no momento da retirada.
        </p>
      </div>
    </section>
  );
}
