import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
// The sort vocabulary and page size live in a client-safe module so the
// filter UI can import them without pulling this server-only file in.
import { PAGE_SIZE, SORT_OPTIONS, parseSort, type SortValue } from "./catalog-options";

/**
 * STOREFRONT CATALOG QUERIES
 * ──────────────────────────
 * Listing/filtering/sorting runs as one SQL statement that resolves the
 * matching product ids (plus a total count) in the right order, then the
 * page of ids is hydrated through Prisma. Doing it this way keeps sorting
 * by "lowest variant price" and "units sold" correct across pagination —
 * neither is expressible with `findMany` alone.
 */

// Re-exported for callers that already import from here.
export { SORT_OPTIONS, PAGE_SIZE, parseSort };
export type { SortValue };

export interface CatalogFilters {
  q?: string;
  category?: string; // category slug
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  wholesaleOnly?: boolean;
  sort?: SortValue;
  page?: number;
  pageSize?: number;
}

export interface CatalogCard {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  images: string[];
  categoryName: string;
  categorySlug: string;
  fromPrice: number; // lowest effective price across active variants
  listPrice: number; // lowest list price, for strike-through
  hasDiscount: boolean;
  variantCount: number;
  totalStock: number;
  hasWholesale: boolean;
  lowStockThreshold: number;
  ratingAvg: number;
  ratingCount: number;
  moq: number;
  isActive: boolean;
}

export interface CatalogResult {
  items: CatalogCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function orderByClause(sort: SortValue): Prisma.Sql {
  switch (sort) {
    case "price-asc":
      return Prisma.sql`agg.effective_price ASC NULLS LAST, p."createdAt" DESC`;
    case "price-desc":
      return Prisma.sql`agg.effective_price DESC NULLS LAST, p."createdAt" DESC`;
    case "rating":
      return Prisma.sql`p."ratingAvg" DESC, p."ratingCount" DESC, p."createdAt" DESC`;
    case "popular":
      return Prisma.sql`COALESCE(sold.units, 0) DESC, p."ratingCount" DESC, p."createdAt" DESC`;
    case "newest":
    default:
      return Prisma.sql`p."createdAt" DESC`;
  }
}

/** Runs the filtered/sorted/paginated catalog search. */
export async function searchProducts(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const {
    q,
    category,
    brands = [],
    minPrice,
    maxPrice,
    inStockOnly,
    wholesaleOnly,
    sort = "newest",
    page = 1,
    pageSize = PAGE_SIZE,
  } = filters;

  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];

  if (q?.trim()) {
    const like = `%${q.trim()}%`;
    conditions.push(
      Prisma.sql`(p.name ILIKE ${like} OR p.brand ILIKE ${like} OR p.sku ILIKE ${like} OR p.description ILIKE ${like} OR c.name ILIKE ${like})`
    );
  }
  if (category) conditions.push(Prisma.sql`c.slug = ${category}`);
  if (brands.length > 0) {
    conditions.push(Prisma.sql`p.brand IN (${Prisma.join(brands)})`);
  }
  if (typeof minPrice === "number" && Number.isFinite(minPrice)) {
    conditions.push(Prisma.sql`agg.effective_price >= ${minPrice}`);
  }
  if (typeof maxPrice === "number" && Number.isFinite(maxPrice)) {
    conditions.push(Prisma.sql`agg.effective_price <= ${maxPrice}`);
  }
  if (inStockOnly) conditions.push(Prisma.sql`COALESCE(agg.total_stock, 0) > 0`);
  if (wholesaleOnly) conditions.push(Prisma.sql`COALESCE(agg.wholesale_tiers, 0) > 0`);

  const where = Prisma.join(conditions, " AND ");
  const offset = (Math.max(1, page) - 1) * pageSize;

  // `agg` collapses each product's active variants to a single row:
  // lowest effective price, total stock, and whether real wholesale tiers exist.
  const rows = await prisma.$queryRaw<{ id: string; total: bigint }[]>`
    WITH agg AS (
      SELECT
        pv."productId",
        MIN(COALESCE(pv."salePrice", pv.price))          AS effective_price,
        SUM(COALESCE(inv.stock, 0))                      AS total_stock,
        COUNT(DISTINCT wt.id) FILTER (WHERE wt."minQty" > 1) AS wholesale_tiers
      FROM "ProductVariant" pv
      LEFT JOIN "Inventory" inv ON inv."productVariantId" = pv.id
      LEFT JOIN "WholesalePriceTier" wt ON wt."productVariantId" = pv.id
      WHERE pv."isActive" = true
      GROUP BY pv."productId"
    ),
    sold AS (
      SELECT oi."productId", SUM(oi.quantity) AS units
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status <> 'CANCELLED'
      GROUP BY oi."productId"
    )
    SELECT p.id, COUNT(*) OVER () AS total
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN agg  ON agg."productId" = p.id
    LEFT JOIN sold ON sold."productId" = p.id
    WHERE ${where}
    ORDER BY ${orderByClause(sort)}
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  const ids = rows.map((r) => r.id);
  const items = await hydrateCards(ids);

  return {
    items,
    total,
    page: Math.max(1, page),
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Loads full card data for a list of product ids, preserving the given order. */
export async function hydrateCards(ids: string[]): Promise<CatalogCard[]> {
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        where: { isActive: true },
        include: {
          inventory: { select: { stock: true, lowStockThreshold: true } },
          wholesaleTiers: { select: { minQty: true } },
        },
      },
    },
  });

  const byId = new Map(products.map((p) => [p.id, p]));

  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map(toCard);
}

type ProductWithVariants = Prisma.ProductGetPayload<{
  include: {
    category: { select: { name: true; slug: true } };
    variants: {
      include: {
        inventory: { select: { stock: true; lowStockThreshold: true } };
        wholesaleTiers: { select: { minQty: true } };
      };
    };
  };
}>;

export function toCard(p: ProductWithVariants): CatalogCard {
  const effective = p.variants.map((v) => Number(v.salePrice ?? v.price));
  const list = p.variants.map((v) => Number(v.price));

  const fromPrice = effective.length ? Math.min(...effective) : Number(p.basePrice);
  const listPrice = list.length ? Math.min(...list) : Number(p.salePrice ? p.basePrice : p.basePrice);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    images: p.images,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    fromPrice,
    listPrice,
    hasDiscount: listPrice > fromPrice,
    variantCount: p.variants.length,
    totalStock: p.variants.reduce((sum, v) => sum + (v.inventory?.stock ?? 0), 0),
    hasWholesale: p.variants.some((v) => v.wholesaleTiers.some((t) => t.minQty > 1)),
    lowStockThreshold: Math.max(...p.variants.map((v) => v.inventory?.lowStockThreshold ?? 5), 5),
    ratingAvg: Number(p.ratingAvg),
    ratingCount: p.ratingCount,
    moq: p.moq,
    isActive: p.isActive,
  };
}

/** Distinct brands that currently have at least one active product. */
export async function getBrands(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, brand: { not: null } },
    distinct: ["brand"],
    select: { brand: true },
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand).filter((b): b is string => Boolean(b));
}

/** Overall price bounds, used to seed the price filter inputs. */
export async function getPriceRange(): Promise<{ min: number; max: number }> {
  const rows = await prisma.$queryRaw<{ min: number | null; max: number | null }[]>`
    SELECT MIN(COALESCE(pv."salePrice", pv.price))::float AS min,
           MAX(COALESCE(pv."salePrice", pv.price))::float AS max
    FROM "ProductVariant" pv
    JOIN "Product" p ON p.id = pv."productId"
    WHERE pv."isActive" = true AND p."isActive" = true
  `;
  return { min: Math.floor(rows[0]?.min ?? 0), max: Math.ceil(rows[0]?.max ?? 0) };
}

export async function getActiveCategories() {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
      products: { where: { isActive: true }, take: 1, select: { images: true } },
    },
  });
  return cats.map((c) => ({
    ...c,
    imageUrl: c.imageUrl || c.products[0]?.images[0] || null,
  }));
}

/** Best sellers by units actually sold (cancelled orders excluded). */
export async function getPopularProducts(limit = 8): Promise<CatalogCard[]> {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "CANCELLED" } }, product: { isActive: true } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  const cards = await hydrateCards(rows.map((r) => r.productId));
  return cards.filter((c) => c.isActive);
}

export async function getNewestProducts(limit = 8): Promise<CatalogCard[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });
  return hydrateCards(products.map((p) => p.id));
}

/** Products from a category, used for the "related products" rail. */
export async function getRelatedProducts(categoryId: string, excludeProductId: string, limit = 4) {
  const products = await prisma.product.findMany({
    where: { isActive: true, categoryId, id: { not: excludeProductId } },
    take: limit,
    orderBy: { ratingCount: "desc" },
    select: { id: true },
  });
  return hydrateCards(products.map((p) => p.id));
}

/** Full product detail for /products/[slug], including tiers and stock. */
export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" },
        include: {
          inventory: true,
          wholesaleTiers: { orderBy: { minQty: "asc" } },
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { name: true, businessProfile: { select: { businessName: true } } } },
        },
      },
    },
  });
}
