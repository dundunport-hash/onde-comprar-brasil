import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/store-contact";

export const SITE_PAGE_CONTENT = {
  about: {
    slug: "about",
    title: "Sobre",
    fallback: `Esta e a pagina institucional da ${SITE_NAME}. Aqui voce encontra informacoes sobre a missao, a estrutura e o atendimento da loja.`,
  },
  terms: {
    slug: "terms",
    title: "Termos",
    fallback: `Aqui voce encontra os termos de uso e condicoes para utilizar o site da ${SITE_NAME}.`,
  },
} as const;

export type SitePageContentKey = keyof typeof SITE_PAGE_CONTENT;

export async function getSitePageContent(key: SitePageContentKey) {
  const config = SITE_PAGE_CONTENT[key];
  const pageContent = await prisma.sitePageContent.findUnique({
    where: {
      slug: config.slug,
    },
  });

  return {
    title: pageContent?.title || config.title,
    content: pageContent?.content || config.fallback,
    updatedAt: pageContent?.updatedAt ?? null,
  };
}

export async function getDashboardSitePageContents() {
  const rows = await prisma.sitePageContent.findMany({
    where: {
      slug: {
        in: Object.values(SITE_PAGE_CONTENT).map((item) => item.slug),
      },
    },
  });
  const rowsBySlug = new Map(rows.map((row) => [row.slug, row]));

  return {
    about:
      rowsBySlug.get(SITE_PAGE_CONTENT.about.slug)?.content ??
      SITE_PAGE_CONTENT.about.fallback,
    terms:
      rowsBySlug.get(SITE_PAGE_CONTENT.terms.slug)?.content ??
      SITE_PAGE_CONTENT.terms.fallback,
  };
}

export function splitSiteContentParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
