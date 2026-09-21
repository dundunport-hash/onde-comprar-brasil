"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import {
  assertHeroBannerDevice,
  assertHeroBannerSlot,
  getDashboardHeroBanners,
  HERO_BANNER_DEVICES,
  HERO_BANNERS_CONTENT_SLUG,
} from "@/lib/hero-banners";
import { prisma } from "@/lib/prisma";
import { sanitizeHttpUrl, sanitizeText } from "@/lib/sanitize";

const DASHBOARD_BANNERS_PATH = "/dashboard/banners";

function parsePositiveInteger(value: FormDataEntryValue | null, field: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new Error(`Informe uma dimensao valida para ${field}.`);
  }

  return numberValue;
}

export async function patchHeroBanner(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    throw new Error("Apenas administradores podem atualizar banners.");
  }

  const device = assertHeroBannerDevice(
    sanitizeText(formData.get("device"), { maxLength: 20 }),
  );
  const slot = assertHeroBannerSlot(Number(formData.get("slot")));
  const src = sanitizeHttpUrl(formData.get("src"));
  const width = parsePositiveInteger(formData.get("width"), "largura");
  const height = parsePositiveInteger(formData.get("height"), "altura");
  const active = formData.get("active") === "on";

  const currentBanners = await getDashboardHeroBanners();
  const nextBanners = HERO_BANNER_DEVICES.flatMap((currentDevice) =>
    currentBanners[currentDevice].map((banner) =>
      banner.device === device && banner.slot === slot
        ? {
            ...banner,
            src: src ?? banner.src,
            width,
            height,
            active,
          }
        : banner,
    ),
  );
  const content = JSON.stringify(nextBanners);

  const storedContent = await prisma.sitePageContent.upsert({
    where: {
      slug: HERO_BANNERS_CONTENT_SLUG,
    },
    create: {
      slug: HERO_BANNERS_CONTENT_SLUG,
      title: "Banners da hero",
      content,
    },
    update: {
      content,
    },
  });

  await recordAuditLog({
    action: "heroBanner.patch",
    entity: "SitePageContent",
    entityId: storedContent.id,
    actor: getAuditActor(session),
    metadata: {
      device,
      slot,
      src,
      width,
      height,
      active,
    },
  });

  revalidateTag("hero-banners", "default");
  revalidatePath("/");
  revalidatePath(DASHBOARD_BANNERS_PATH);
  redirect(`${DASHBOARD_BANNERS_PATH}?updated=1#${device}-${slot}`);
}
