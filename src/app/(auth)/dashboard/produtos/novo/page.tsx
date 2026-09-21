import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin";
import { getCachedCatalogCategories } from "@/lib/catalog-cache";
import { SITE_NAME } from "@/lib/store-contact";
import { createProduct } from "../actions";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = {
  title: `Novo produto | Dashboard ${SITE_NAME}`,
  description: "Cadastre um novo produto no catálogo administrativo da loja.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewProductPage() {
  await requireAdminSession();

  const categories = (await getCachedCatalogCategories()) as unknown as {
    id: string;
    name: string;
  }[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Produtos
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Novo produto</h1>
        <p className="mt-2 text-sm text-muted">
          Preencha os dados principais para publicar um item no catálogo.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <ProductForm
          action={createProduct}
          categories={categories}
          submitLabel="Cadastrar produto"
        />
      </div>
    </main>
  );
}
