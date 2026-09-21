"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { SITE_PAGE_CONTENT } from "@/lib/site-content";

const CONTENT_MAX_LENGTH = 12000;

function getContent(formData: FormData, key: string) {
  return sanitizeText(formData.get(key), {
    maxLength: CONTENT_MAX_LENGTH,
    preserveNewlines: true,
  });
}

async function upsertSitePageContent({
  slug,
  title,
  content,
}: {
  slug: string;
  title: string;
  content: string;
}) {
  return prisma.sitePageContent.upsert({
    where: {
      slug,
    },
    create: {
      slug,
      title,
      content,
    },
    update: {
      title,
      content,
    },
  });
}

export async function updateSiteContents(formData: FormData) {
  const session = await requireAdminSession();
  const about = getContent(formData, "aboutContent");
  const terms = getContent(formData, "termsContent");

  if (!about) {
    throw new Error("Informe o conteudo da pagina Sobre.");
  }

  if (!terms) {
    throw new Error("Informe o conteudo da pagina Termos.");
  }

  const [aboutContent, termsContent] = await Promise.all([
    upsertSitePageContent({
      slug: SITE_PAGE_CONTENT.about.slug,
      title: SITE_PAGE_CONTENT.about.title,
      content: about,
    }),
    upsertSitePageContent({
      slug: SITE_PAGE_CONTENT.terms.slug,
      title: SITE_PAGE_CONTENT.terms.title,
      content: terms,
    }),
  ]);

  await recordAuditLog({
    action: "site_content.update",
    entity: "SitePageContent",
    entityId: null,
    actor: getAuditActor(session),
    metadata: {
      pages: [aboutContent.slug, termsContent.slug],
      aboutLength: aboutContent.content.length,
      termsLength: termsContent.content.length,
    },
  });

  revalidatePath("/dashboard/conteudo");
  revalidatePath("/about");
  revalidatePath("/terms");

  redirect("/dashboard/conteudo?updated=1");
}
