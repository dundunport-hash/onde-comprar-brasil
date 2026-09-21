import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promotion: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createPromotion, deletePromotion, togglePromotion } from "./actions";

const mockedRequireAdminSession = requireAdminSession as unknown as Mock;
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedRedirect = vi.mocked(redirect);
const mockedCreate = vi.mocked(prisma.promotion.create);
const mockedDelete = vi.mocked(prisma.promotion.delete);
const mockedUpdate = vi.mocked(prisma.promotion.update);

function buildPromotionForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const values = {
    name: "Oferta da semana",
    description: "Desconto especial",
    productId: "product-1",
    discountPercent: "10",
    discountFixed: "0",
    startDate: "2026-05-18T09:00",
    endDate: "2026-05-25T09:00",
    active: "on",
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAdminSession.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "ADMIN",
    },
  });
});

describe("promotion admin actions", () => {
  it("creates a promotion and revalidates storefront views", async () => {
    await createPromotion(buildPromotionForm());

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        name: "Oferta da semana",
        description: "Desconto especial",
        productId: "product-1",
        discountPercent: 10,
        discountFixed: 0,
        startDate: new Date("2026-05-18T09:00"),
        endDate: new Date("2026-05-25T09:00"),
        active: true,
      },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/promocoes");
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/dashboard/promocoes?created=1",
    );
  });

  it("rejects promotions without a discount", async () => {
    await expect(
      createPromotion(
        buildPromotionForm({
          discountPercent: "0",
          discountFixed: "0",
        }),
      ),
    ).rejects.toThrow("Informe pelo menos um desconto.");

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("toggles a promotion status", async () => {
    const formData = new FormData();
    formData.set("promotionId", "promotion-1");
    formData.set("active", "false");

    await togglePromotion(formData);

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: {
        id: "promotion-1",
      },
      data: {
        active: false,
      },
    });
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/dashboard/promocoes?updated=1",
    );
  });

  it("deletes a promotion", async () => {
    const formData = new FormData();
    formData.set("promotionId", "promotion-1");

    await deletePromotion(formData);

    expect(mockedDelete).toHaveBeenCalledWith({
      where: {
        id: "promotion-1",
      },
    });
    expect(mockedRedirect).toHaveBeenCalledWith(
      "/dashboard/promocoes?deleted=1",
    );
  });
});
