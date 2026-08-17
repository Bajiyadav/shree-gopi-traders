/**
 * Catalogue and business-data audit.
 *
 * Reports the invariants the storefront depends on: every active product must
 * be purchasable, every cached rating must match its reviews, and no live
 * order may carry a total without the line items that justify it.
 *
 * Read-only. Touches no images, videos or Cloudinary assets.
 *
 * Run with: npx tsx scripts/final-data-audit.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXPECTED_ACTIVE = 200;
const EXPECTED_V3_IMAGES = 600;

/** Written by scripts/backfill-missing-variants.ts; marks stock never counted. */
const BACKFILL_REASON = "Variant backfill — opening balance, pending physical stock count";

let failures = 0;

function line(label: string, actual: number | string, expected?: number | string) {
  if (expected === undefined) {
    console.log(`  ·  ${label.padEnd(46)} ${actual}`);
    return;
  }
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "✓" : "✗"}  ${label.padEnd(46)} ${actual}${ok ? "" : `   (expected ${expected})`}`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Shree Gopi Traders — catalogue & business-data audit         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // ══ Catalogue ══════════════════════════════════════════════
  console.log("\nCatalogue");
  const activeProducts = await prisma.product.count({ where: { isActive: true } });
  const activeZeroVariants = await prisma.product.count({
    where: { isActive: true, variants: { none: {} } },
  });
  const activePurchasable = await prisma.product.count({
    where: { isActive: true, variants: { some: { isActive: true, inventory: { isNot: null } } } },
  });
  line("Active products", activeProducts, EXPECTED_ACTIVE);
  line("Active products with zero variants", activeZeroVariants, 0);
  line("Active products with purchasable variants", activePurchasable, EXPECTED_ACTIVE);

  const badSku = await prisma.$queryRaw<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM "Product"
    WHERE sku !~ '^(SGT|MDM|RCH)-.*$' AND name NOT LIKE 'E2E Test%'
  `;
  line("Products with invalid SKU", badSku[0].c, 0);

  const missingPrice = await prisma.$queryRaw<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    WHERE p."isActive" = true AND (v.price IS NULL OR v.price <= 0)
  `;
  line("Active variants with missing/zero price", missingPrice[0].c, 0);

  const shortDesc = await prisma.$queryRaw<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM "Product"
    WHERE LENGTH(description) < 80 AND name NOT LIKE 'E2E Test%'
  `;
  line("Products with a stub description (<80 chars)", shortDesc[0].c, 0);

  const noInventory = await prisma.productVariant.count({ where: { inventory: null } });
  line("Variants without an inventory row", noInventory, 0);

  // Zero stock is only acceptable when it is an honest "not counted yet".
  // Anything else at zero is a real gap somebody needs to look at.
  const zeroStock = await prisma.product.findMany({
    where: { isActive: true, variants: { every: { inventory: { stock: { lte: 0 } } } } },
    select: { id: true, variants: { select: { inventory: { select: { transactions: { select: { reason: true } } } } } } },
  });
  const pendingCount = zeroStock.filter((p) =>
    p.variants.some((v) => v.inventory?.transactions.some((t) => t.reason === BACKFILL_REASON))
  ).length;
  line("Active products awaiting physical stock count", pendingCount);
  line("Active products at zero stock, unexplained", zeroStock.length - pendingCount, 0);

  // ══ Reviews ════════════════════════════════════════════════
  console.log("\nReviews");
  const approved = await prisma.review.count({ where: { status: "APPROVED" } });
  const nonApproved = await prisma.review.count({ where: { status: { not: "APPROVED" } } });
  line("Approved reviews", approved);
  line("Pending / rejected reviews (excluded)", nonApproved);

  const drift = await prisma.$queryRaw<{ countMismatch: number; avgMismatch: number }[]>`
    SELECT
      COUNT(*) FILTER (WHERE p."ratingCount" IS DISTINCT FROM COALESCE(r.cnt, 0))::int AS "countMismatch",
      COUNT(*) FILTER (WHERE p."ratingAvg"  IS DISTINCT FROM COALESCE(r.avg, 0))::int AS "avgMismatch"
    FROM "Product" p
    LEFT JOIN (
      SELECT "productId", COUNT(*)::int AS cnt, ROUND(AVG(rating)::numeric, 2) AS avg
      FROM "Review" WHERE status = 'APPROVED' GROUP BY "productId"
    ) r ON r."productId" = p.id
  `;
  line("Products with ratingCount mismatch", drift[0].countMismatch, 0);
  line("Products with rating average mismatch", drift[0].avgMismatch, 0);

  const summed = await prisma.product.aggregate({ _sum: { ratingCount: true } });
  line("Sum of every Product.ratingCount", summed._sum.ratingCount ?? 0, approved);

  // ══ Orders ═════════════════════════════════════════════════
  console.log("\nOrders");
  const confirmedEmpty = await prisma.order.count({
    where: { status: "CONFIRMED", items: { none: {} } },
  });
  const liveEmpty = await prisma.order.count({
    where: { status: { not: "CANCELLED" }, items: { none: {} } },
  });
  line("CONFIRMED orders with zero items", confirmedEmpty, 0);
  line("Non-cancelled orders with zero items", liveEmpty, 0);

  if (liveEmpty > 0) {
    const offenders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" }, items: { none: {} } },
      select: { orderNumber: true, status: true, paymentStatus: true, total: true, customer: { select: { email: true } } },
    });
    offenders.forEach((o) =>
      console.log(`       ↳ ${o.orderNumber}  ${o.status}  pay=${o.paymentStatus}  ₹${o.total}  ${o.customer.email}`)
    );
  }

  // ══ Media (read-only — nothing here writes) ═════════════════
  console.log("\nMedia");
  const imgs = await prisma.$queryRaw<{ v3: number; other: number }[]>`
    SELECT
      COUNT(*) FILTER (WHERE img LIKE '%/products/v3/%')::int AS v3,
      COUNT(*) FILTER (WHERE img NOT LIKE '%/products/v3/%')::int AS other
    FROM "Product" p, UNNEST(p.images) AS img
    WHERE p."isActive" = true
  `;
  line("Active V3 images", imgs[0].v3, EXPECTED_V3_IMAGES);
  line("Active non-V3 / legacy images", imgs[0].other, 0);

  console.log(
    failures === 0
      ? "\nRESULT: PASS — every invariant holds\n"
      : `\nRESULT: ${failures} invariant(s) failing\n`
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
