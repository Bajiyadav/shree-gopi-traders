import "server-only";
import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

/**
 * SERVER-SIDE PRICING ENGINE
 * ──────────────────────────
 * The frontend NEVER decides the final price. Every quantity/price
 * calculation used at add-to-cart, cart-view, and checkout time must
 * go through these functions, which read current price + wholesale
 * tiers + stock straight from the database.
 */

export interface VariantPriceResult {
  productVariantId: string;
  unitPrice: Prisma.Decimal; // price actually charged per unit at this quantity
  listPrice: Prisma.Decimal; // undiscounted variant price
  tierApplied: { minQty: number; maxQty: number | null } | null;
  quantity: number;
  lineTotal: Prisma.Decimal;
  availableStock: number;
  inStock: boolean;
}

/**
 * Given a variant + requested quantity, resolve the correct per-unit
 * price by checking wholesale tiers (highest qualifying tier wins),
 * and validate stock. Always call this at cart-add and checkout time —
 * never trust a price sent from the client.
 */
export async function resolveVariantPrice(
  productVariantId: string,
  quantity: number
): Promise<VariantPriceResult> {
  if (quantity < 1) throw new Error("Quantity must be at least 1");

  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    include: {
      wholesaleTiers: { orderBy: { minQty: "asc" } },
      inventory: true,
      product: { select: { isActive: true, allowBackorder: true } },
    },
  });

  if (!variant) throw new Error("Product variant not found");
  if (!variant.isActive || !variant.product.isActive) {
    throw new Error("This product is not currently available");
  }

  const availableStock = variant.inventory?.stock ?? 0;
  const inStock = variant.product.allowBackorder || availableStock >= quantity;

  // Pick the best-matching tier: the highest minQty this quantity satisfies,
  // and (if maxQty is set) the quantity must not exceed it.
  const bestTier = selectTier(variant.wholesaleTiers, quantity);

  // A matching wholesale tier is an explicit admin decision and wins.
  // With no tier, an active markdown applies; otherwise the list price.
  const unitPrice = bestTier ? bestTier.pricePerUnit : variant.salePrice ?? variant.price;
  const lineTotal = unitPrice.mul(quantity);

  return {
    productVariantId,
    unitPrice,
    listPrice: variant.price,
    tierApplied: bestTier ? { minQty: bestTier.minQty, maxQty: bestTier.maxQty } : null,
    quantity,
    lineTotal,
    availableStock,
    inStock,
  };
}

/**
 * Resolve prices for every line in a cart/checkout in one pass.
 */
export async function resolveCartPricing(
  lines: { productVariantId: string; quantity: number }[]
) {
  const results = await Promise.all(
    lines.map((l) => resolveVariantPrice(l.productVariantId, l.quantity))
  );
  const subtotal = results.reduce((sum, r) => sum.add(r.lineTotal), new Prisma.Decimal(0));
  const outOfStockLines = results.filter((r) => !r.inStock);
  return { results, subtotal, outOfStockLines };
}

/**
 * Validate + apply a coupon code server-side. Returns discount amount
 * (never negative, never exceeding maxDiscount, never below minOrderValue).
 */
export async function resolveCouponDiscount(code: string | null, subtotal: Prisma.Decimal) {
  if (!code) return { discount: new Prisma.Decimal(0), coupon: null as null | { code: string } };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();

  if (
    !coupon ||
    !coupon.isActive ||
    now < coupon.startDate ||
    now > coupon.endDate ||
    (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) ||
    (coupon.minOrderValue && subtotal.lt(coupon.minOrderValue))
  ) {
    throw new Error("Coupon is invalid or no longer applicable");
  }

  let discount =
    coupon.discountType === "PERCENTAGE"
      ? subtotal.mul(coupon.discountValue).div(100)
      : coupon.discountValue;

  if (coupon.maxDiscount && discount.gt(coupon.maxDiscount)) {
    discount = coupon.maxDiscount;
  }
  if (discount.gt(subtotal)) discount = subtotal;

  return { discount, coupon: { code: coupon.code } };
}

/**
 * Non-throwing wrapper for rendering: an expired/invalid coupon should
 * grey out the cart line, not blow up the page.
 */
export async function safeCouponDiscount(code: string | null, subtotal: Prisma.Decimal) {
  if (!code) return { discount: new Prisma.Decimal(0), coupon: null, error: null as string | null };
  try {
    const res = await resolveCouponDiscount(code, subtotal);
    return { ...res, error: null as string | null };
  } catch (err) {
    return {
      discount: new Prisma.Decimal(0),
      coupon: null,
      error: err instanceof Error ? err.message : "Coupon could not be applied",
    };
  }
}

export const FREE_DELIVERY_THRESHOLD = 5000;
export const FLAT_DELIVERY_FEE = 199;

/** Flat delivery fee logic — placeholder, easy to swap for zone/weight based calc later. */
export function calculateDeliveryFee(subtotal: Prisma.Decimal): Prisma.Decimal {
  return subtotal.gte(FREE_DELIVERY_THRESHOLD)
    ? new Prisma.Decimal(0)
    : new Prisma.Decimal(FLAT_DELIVERY_FEE);
}

/**
 * Picks the wholesale tier that applies at a given quantity from an
 * already-loaded tier list. Pure function so both the server pricing path
 * and the product-page preview agree on the same rule.
 */
export function selectTier<T extends { minQty: number; maxQty: number | null }>(
  tiers: T[],
  quantity: number
): T | null {
  let best: T | null = null;
  for (const tier of tiers) {
    const withinRange = quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty);
    if (withinRange && (!best || tier.minQty > best.minQty)) best = tier;
  }
  return best;
}

/**
 * Rejects a new/edited wholesale tier that would overlap an existing one
 * for the same variant (spec §32 — tiers must not overlap).
 */
export function tiersOverlap(
  existing: { id: string; minQty: number; maxQty: number | null }[],
  candidate: { id?: string; minQty: number; maxQty: number | null }
): boolean {
  const candMax = candidate.maxQty ?? Number.MAX_SAFE_INTEGER;
  return existing.some((t) => {
    if (candidate.id && t.id === candidate.id) return false; // ignore the row being edited
    const tMax = t.maxQty ?? Number.MAX_SAFE_INTEGER;
    return candidate.minQty <= tMax && t.minQty <= candMax;
  });
}
