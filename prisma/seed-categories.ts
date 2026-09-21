import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Eletrônicos",
    slug: "eletronicos",
    description: "Produtos eletrônicos, tecnologia e acessórios.",
    image: "/images/categories/01_eletronicos.png",
  },
  {
    name: "Casa e Decoração",
    slug: "casa-e-decoracao",
    description: "Produtos para casa, decoração, móveis e utilidades.",
    image: "/images/categories/02_casa_e_decoracao.png",
  },
  {
    name: "Moda",
    slug: "moda",
    description: "Roupas, calçados e acessórios.",
    image: "/images/categories/03_moda.png",
  },
  {
    name: "Beleza e Saúde",
    slug: "beleza-e-saude",
    description: "Produtos de beleza, higiene, cuidados pessoais e saúde.",
    image: "/images/categories/04_beleza_e_saude.png",
  },
  {
    name: "Esporte e Lazer",
    slug: "esporte-e-lazer",
    description: "Produtos para esportes, atividades físicas e lazer.",
    image: "/images/categories/05_esporte_e_lazer.png",
  },
  {
    name: "Alimentos e Bebidas",
    slug: "alimentos-e-bebidas",
    description: "Alimentos, bebidas e produtos relacionados.",
    image: "/images/categories/06_alimentos_e_bebidas.png",
  },
  {
    name: "Papelaria",
    slug: "papelaria",
    description: "Materiais escolares, escritório e papelaria.",
    image: "/images/categories/07_papelaria.png",
  },
  {
    name: "Brinquedos",
    slug: "brinquedos",
    description: "Brinquedos, jogos e produtos infantis.",
    image: "/images/categories/08_brinquedos.png",
  },
  {
    name: "Automotivo",
    slug: "automotivo",
    description: "Produtos, acessórios e utilidades automotivas.",
    image: "/images/categories/09_automotivo.png",
  },
  {
    name: "Pet Shop",
    slug: "pet-shop",
    description: "Produtos e acessórios para animais de estimação.",
    image: "/images/categories/10_pet_shop.png",
  },
  {
    name: "Ferramentas",
    slug: "ferramentas",
    description: "Ferramentas, equipamentos e acessórios para manutenção.",
    image: "/images/categories/11_ferramentas.png",
  },
] as const;

async function main() {
  console.log("Iniciando seed de categorias...");

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        image: category.image,
      },
      create: category,
    });
  }

  console.log(
    `Seed concluído: ${categories.length} categorias cadastradas/atualizadas.`,
  );
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed de categorias:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
