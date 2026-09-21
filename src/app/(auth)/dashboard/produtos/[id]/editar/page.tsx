import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { getCachedCatalogCategories } from "@/lib/catalog-cache";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/store-contact";
import { updateProduct } from "../../actions";
import { ProductForm } from "../../ProductForm";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      name: true,
    },
  });

  return {
    title: product
      ? `Editar ${product.name} | Dashboard ${SITE_NAME}`
      : `Editar produto | Dashboard ${SITE_NAME}`,
    description: product
      ? `Atualize preço, estoque e dados cadastrais de ${product.name}.`
      : "Atualize dados cadastrais de um produto da loja.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  await requireAdminSession();

  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        technicalData: true,
        imageUrl: true,
        imageUrl2: true,
        imageUrl3: true,
        ean: true,
        price: true,
        stock: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        weightKg: true,
        active: true,
        categoryId: true,
      },
    }),
    getCachedCatalogCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const categoriesList = categories as unknown as {
    id: string;
    name: string;
  }[];

  const updateProductWithId = updateProduct.bind(null, product.id);
  const productFormValues = {
    ...product,
    ean: product.ean?.toString() ?? null,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Produtos
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Editar produto
        </h1>
        <p className="mt-2 text-sm text-muted">
          Atualize cadastro, preço, estoque e status do produto.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <ProductForm
          action={updateProductWithId}
          categories={categoriesList}
          product={productFormValues}
          submitLabel="Salvar alterações"
        />
      </div>
    </main>
  );
}
