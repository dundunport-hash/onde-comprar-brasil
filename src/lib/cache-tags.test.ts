import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { revalidatePath, revalidateTag } from "next/cache";
import {
  CACHE_TAGS,
  invalidateCatalogCache,
  revalidateCatalogCache,
} from "./cache-tags";

const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedRevalidateTag = vi.mocked(revalidateTag);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("catalog cache tags", () => {
  it("invalidates all catalog tags immediately", () => {
    invalidateCatalogCache();

    expect(mockedRevalidateTag).toHaveBeenCalledTimes(4);
    expect(mockedRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.catalogProducts,
      { expire: 0 },
    );
    expect(mockedRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.catalogCategories,
      { expire: 0 },
    );
    expect(mockedRevalidateTag).toHaveBeenCalledWith(
      CACHE_TAGS.catalogPromotions,
      { expire: 0 },
    );
    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.catalogStock, {
      expire: 0,
    });
  });

  it("revalidates catalog paths after invalidating tags", () => {
    revalidateCatalogCache();

    expect(mockedRevalidateTag).toHaveBeenCalledTimes(4);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/product/[slug]",
      "page",
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/produtos");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/promocoes");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard/estoque");
  });
});
