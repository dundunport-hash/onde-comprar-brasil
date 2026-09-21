import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

type SeedProduct = {
  name: string;
  slug: string;
  description?: string | null;
  technicalData?: string | null;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  imageUrl3?: string | null;
  ean?: string | null;
  price: number;
  stock?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  weightKg?: number;
  active?: boolean;
  categorySlug: string;
};

async function main() {
  const filePath = path.join(process.cwd(), "prisma", "data", "products.json");
  const raw = await readFile(filePath, "utf8");
  const products = JSON.parse(raw) as SeedProduct[];

  const categorySlugs = [
    ...new Set(products.map((product) => product.categorySlug)),
  ];

  const categories = await prisma.category.findMany({
    where: { slug: { in: categorySlugs } },
    select: { id: true, slug: true },
  });

  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category.id] as const),
  );

  const missingCategories = categorySlugs.filter(
    (slug) => !categoryBySlug.has(slug),
  );

  if (missingCategories.length > 0) {
    throw new Error(
      `Categorias não encontradas: ${missingCategories.join(", ")}. Execute primeiro o seed de categorias.`,
    );
  }

  let processed = 0;

  for (const product of products) {
    const categoryId = categoryBySlug.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`Categoria inválida para o produto: ${product.slug}`);
    }

    const data = {
      name: product.name,
      description: product.description ?? null,
      technicalData: product.technicalData ?? null,
      imageUrl: product.imageUrl ?? null,
      imageUrl2: product.imageUrl2 ?? null,
      imageUrl3: product.imageUrl3 ?? null,
      ean: product.ean ? BigInt(product.ean) : null,
      price: product.price,
      stock: product.stock ?? 0,
      lengthCm: product.lengthCm ?? 20,
      widthCm: product.widthCm ?? 16,
      heightCm: product.heightCm ?? 5,
      weightKg: product.weightKg ?? 0.5,
      active: product.active ?? true,
      categoryId,
    };

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: {
        slug: product.slug,
        ...data,
      },
    });

    processed += 1;
  }

  console.log(`Seed concluído: ${processed} produtos cadastrados/atualizados.`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed de produtos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
