import type { HomeProduct } from "@/lib/catalog-cache";
import { calculateProductPricing } from "@/lib/pricing";

export function selectHomeProducts(
  candidates: { offers: HomeProduct[]; highlights: HomeProduct[] },
  referenceDate = new Date(),
) {
  const prepare = (products: HomeProduct[]) =>
    products
      .filter((product) => product.active && product.stock > 0)
      .map((product) => ({
        product,
        pricing: calculateProductPricing(
          product.price,
          product.promotions,
          referenceDate,
        ),
      }));
  const offers = prepare(candidates.offers)
    .filter(({ pricing }) => pricing.discount > 0)
    .sort((a, b) => b.pricing.discountPercent - a.pricing.discountPercent)
    .slice(0, 4);
  const offerIds = new Set(offers.map(({ product }) => product.id));
  const highlights = prepare(candidates.highlights)
    .filter(({ product }) => !offerIds.has(product.id))
    .slice(0, 6);
  return { offers, highlights };
}
