import { unstable_cache as cache } from "next/cache";

import { images, type ResponsiveBanner } from "@/db/images";
import { prisma } from "@/lib/prisma";

export const HERO_BANNER_SLOTS = 10;
export const HERO_BANNERS_CONTENT_SLUG = "hero-banners";

export const HERO_BANNER_DEVICES = ["desktop", "tablet", "mobile"] as const;

export type HeroBannerDevice = (typeof HERO_BANNER_DEVICES)[number];

export type HeroBannerSlot = {
  device: HeroBannerDevice;
  slot: number;
  src: string;
  width: number;
  height: number;
  active: boolean;
};

type StoredHeroBannerSlot = {
  device?: string;
  slot?: number;
  src?: string | null;
  width?: number;
  height?: number;
  active?: boolean;
};

function isHeroBannerDevice(value: string): value is HeroBannerDevice {
  return HERO_BANNER_DEVICES.includes(value as HeroBannerDevice);
}

export function assertHeroBannerDevice(value: string): HeroBannerDevice {
  if (!isHeroBannerDevice(value)) {
    throw new Error("Tipo de banner inválido.");
  }

  return value;
}

export function assertHeroBannerSlot(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > HERO_BANNER_SLOTS) {
    throw new Error("Posição do banner inválida.");
  }

  return value;
}

function getFallbackBanner(device: HeroBannerDevice, slot: number) {
  const banner = images[slot - 1] ?? images[0];

  if (!banner) {
    throw new Error("Nenhum banner padrão foi configurado.");
  }

  return banner[device];
}

function parseStoredHeroBanners(
  content: string | null | undefined,
): StoredHeroBannerSlot[] {
  if (!content) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is StoredHeroBannerSlot =>
        typeof item === "object" && item !== null,
    );
  } catch {
    return [];
  }
}

function toBannerSlot(
  device: HeroBannerDevice,
  slot: number,
  savedBanner?: StoredHeroBannerSlot,
): HeroBannerSlot {
  const fallback = getFallbackBanner(device, slot);

  return {
    device,
    slot,
    src: savedBanner?.src || fallback.src,
    width: savedBanner?.width ?? fallback.width,
    height: savedBanner?.height ?? fallback.height,
    active: savedBanner?.active ?? true,
  };
}

export async function getDashboardHeroBanners(): Promise<
  Record<HeroBannerDevice, HeroBannerSlot[]>
> {
  const savedContent = await prisma.sitePageContent.findUnique({
    where: {
      slug: HERO_BANNERS_CONTENT_SLUG,
    },
    select: {
      content: true,
    },
  });

  const savedBanners = parseStoredHeroBanners(savedContent?.content);

  return HERO_BANNER_DEVICES.reduce(
    (groups, device) => {
      groups[device] = Array.from({ length: HERO_BANNER_SLOTS }, (_, index) => {
        const slot = index + 1;

        const savedBanner = savedBanners.find(
          (banner) => banner.device === device && banner.slot === slot,
        );

        return toBannerSlot(device, slot, savedBanner);
      });

      return groups;
    },
    {} as Record<HeroBannerDevice, HeroBannerSlot[]>,
  );
}

async function getActiveHeroBannersFromDatabase(): Promise<ResponsiveBanner[]> {
  const savedContent = await prisma.sitePageContent.findUnique({
    where: {
      slug: HERO_BANNERS_CONTENT_SLUG,
    },
    select: {
      content: true,
    },
  });

  const savedBanners = parseStoredHeroBanners(savedContent?.content);

  return Array.from({ length: HERO_BANNER_SLOTS }, (_, index) => {
    const slot = index + 1;
    const fallback = images[index] ?? images[0];

    if (!fallback) {
      throw new Error("Nenhum banner padrão foi configurado.");
    }

    const savedSlotBanners = HERO_BANNER_DEVICES.map((device) =>
      savedBanners.find((item) => item.device === device && item.slot === slot),
    );

    const hasDisabledBanner = savedSlotBanners.some(
      (banner) => banner?.active === false,
    );

    if (hasDisabledBanner) {
      return null;
    }

    return HERO_BANNER_DEVICES.reduce(
      (banner, device) => {
        const savedBanner = savedBanners.find(
          (item) =>
            item.device === device &&
            item.slot === slot &&
            item.active !== false &&
            Boolean(item.src),
        );

        banner[device] = savedBanner
          ? {
              src: savedBanner.src || fallback[device].src,
              width: savedBanner.width ?? fallback[device].width,
              height: savedBanner.height ?? fallback[device].height,
            }
          : fallback[device];

        return banner;
      },
      { id: slot } as ResponsiveBanner,
    );
  }).filter((banner): banner is ResponsiveBanner => banner !== null);
}

export const getCachedActiveHeroBanners = cache(
  getActiveHeroBannersFromDatabase,
  ["active-hero-banners"],
  {
    tags: ["hero-banners"],
  },
);
