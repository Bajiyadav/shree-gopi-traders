/**
 * READ-ONLY state snapshot.
 *
 * Establishes what the database currently contains. It compares against no
 * target and asserts nothing — it only reports. Every statement here is a
 * SELECT; this script performs no writes of any kind.
 *
 * Run with: npx tsx scripts/readonly-state-snapshot.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function table(rows: Record<string, string | number>[]) {
  rows.forEach((r) => {
    const [k, v] = Object.values(r);
    console.log(`    ${String(k).slice(0, 44).padEnd(46)} ${v}`);
  });
}

async function main() {
  const stamp = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`;
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  READ-ONLY DATABASE SNAPSHOT                                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`Taken at (db clock): ${stamp[0].now.toISOString()}`);

  // ══ 1-3. Product counts ════════════════════════════════════
  const total = await prisma.product.count();
  const active = await prisma.product.count({ where: { isActive: true } });
  const inactive = await prisma.product.count({ where: { isActive: false } });
  console.log("\n1-3. PRODUCT COUNTS");
  console.log(`    Total products                                 ${total}`);
  console.log(`    Active products                                ${active}`);
  console.log(`    Inactive products                              ${inactive}`);

  // ══ 4. Active products by brand ════════════════════════════
  console.log("\n4. ACTIVE PRODUCTS BY BRAND");
  const byBrand = await prisma.$queryRaw<{ brand: string; c: number }[]>`
    SELECT COALESCE(brand, '(no brand)') AS brand, COUNT(*)::int AS c
    FROM "Product" WHERE "isActive" = true GROUP BY 1 ORDER BY c DESC, brand ASC
  `;
  table(byBrand.map((r) => ({ k: r.brand, v: r.c })));
  console.log(`    ${"—".repeat(46)} ${byBrand.reduce((s, r) => s + r.c, 0)}`);

  // ══ 5. Active products by category ═════════════════════════
  console.log("\n5. ACTIVE PRODUCTS BY CATEGORY");
  const byCat = await prisma.$queryRaw<{ name: string; c: number }[]>`
    SELECT c.name, COUNT(*)::int AS c
    FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
    WHERE p."isActive" = true GROUP BY 1 ORDER BY c DESC, c.name ASC
  `;
  table(byCat.map((r) => ({ k: r.name, v: r.c })));
  console.log(`    ${"—".repeat(46)} ${byCat.reduce((s, r) => s + r.c, 0)}`);

  // ══ 6-10. Image-count distribution ═════════════════════════
  console.log("\n6-10. IMAGE COUNT DISTRIBUTION");
  const dist = await prisma.$queryRaw<{ n: number; allP: number; activeP: number }[]>`
    SELECT COALESCE(ARRAY_LENGTH(images, 1), 0) AS n,
           COUNT(*)::int AS "allP",
           COUNT(*) FILTER (WHERE "isActive" = true)::int AS "activeP"
    FROM "Product" GROUP BY 1 ORDER BY 1
  `;
  console.log(`    images/product        all products      active products`);
  dist.forEach((r) =>
    console.log(`      ${String(r.n).padEnd(20)} ${String(r.allP).padEnd(17)} ${r.activeP}`)
  );
  const gt3 = dist.filter((r) => r.n > 3);
  console.log(
    `      (>3 images)          ${gt3.reduce((s, r) => s + r.allP, 0).toString().padEnd(17)} ${gt3.reduce((s, r) => s + r.activeP, 0)}`
  );

  // ══ Image source breakdown ═════════════════════════════════
  // Classified per image assignment: a product contributes one row per image.
  console.log("\nIMAGE SOURCE BREAKDOWN — ACTIVE products");
  const act = await prisma.$queryRaw<{ bucket: string; c: number }[]>`
    SELECT CASE
      WHEN img LIKE '%placeholder%'                                    THEN 'Placeholder'
      WHEN img LIKE '%res.cloudinary.com%' AND img LIKE '%/products/v3/%' THEN 'V3 Cloudinary'
      WHEN img LIKE '%res.cloudinary.com%' AND img LIKE '%/products/v4/%' THEN 'V4 Cloudinary'
      WHEN img LIKE '%res.cloudinary.com%' AND (img LIKE '%/products/v2/%' OR img LIKE '%/products/v1/%') THEN 'Old/V2 Cloudinary'
      WHEN img LIKE '%res.cloudinary.com%'                             THEN 'Other Cloudinary'
      WHEN img LIKE '/%'                                               THEN 'Local /public'
      ELSE 'Other'
    END AS bucket, COUNT(*)::int AS c
    FROM "Product" p, UNNEST(p.images) AS img
    WHERE p."isActive" = true GROUP BY 1 ORDER BY c DESC
  `;
  table(act.map((r) => ({ k: r.bucket, v: r.c })));
  console.log(`    ${"—".repeat(46)} ${act.reduce((s, r) => s + r.c, 0)}`);

  console.log("\nIMAGE SOURCE BREAKDOWN — ALL products (active + inactive)");
  const all = await prisma.$queryRaw<{ bucket: string; c: number }[]>`
    SELECT CASE
      WHEN img LIKE '%placeholder%'                                    THEN 'Placeholder'
      WHEN img LIKE '%res.cloudinary.com%' AND img LIKE '%/products/v3/%' THEN 'V3 Cloudinary'
      WHEN img LIKE '%res.cloudinary.com%' AND img LIKE '%/products/v4/%' THEN 'V4 Cloudinary'
      WHEN img LIKE '%res.cloudinary.com%' AND (img LIKE '%/products/v2/%' OR img LIKE '%/products/v1/%') THEN 'Old/V2 Cloudinary'
      WHEN img LIKE '%res.cloudinary.com%'                             THEN 'Other Cloudinary'
      WHEN img LIKE '/%'                                               THEN 'Local /public'
      ELSE 'Other'
    END AS bucket, COUNT(*)::int AS c
    FROM "Product" p, UNNEST(p.images) AS img
    GROUP BY 1 ORDER BY c DESC
  `;
  table(all.map((r) => ({ k: r.bucket, v: r.c })));
  console.log(`    ${"—".repeat(46)} ${all.reduce((s, r) => s + r.c, 0)}`);

  // ══ Write-activity probe (read-only) ═══════════════════════
  console.log("\nRECENT WRITE ACTIVITY (newest updatedAt per table)");
  const recent = await prisma.$queryRaw<{ label: string; latest: Date | null; last10min: number }[]>`
    SELECT 'Product' AS label, MAX("updatedAt") AS latest,
           COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '10 minutes')::int AS last10min FROM "Product"
    UNION ALL SELECT 'ProductVariant', MAX("updatedAt"),
           COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '10 minutes')::int FROM "ProductVariant"
    UNION ALL SELECT 'Inventory', MAX("updatedAt"),
           COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '10 minutes')::int FROM "Inventory"
    UNION ALL SELECT 'Order', MAX("updatedAt"),
           COUNT(*) FILTER (WHERE "updatedAt" > NOW() - INTERVAL '10 minutes')::int FROM "Order"
  `;
  recent.forEach((r) =>
    console.log(`    ${r.label.padEnd(18)} latest=${r.latest ? r.latest.toISOString() : "—"}   changed in last 10 min: ${r.last10min}`)
  );

  console.log("\nOTHER RECORD COUNTS (for later comparison)");
  console.log(`    ProductVariant        ${await prisma.productVariant.count()}`);
  console.log(`    Inventory             ${await prisma.inventory.count()}`);
  console.log(`    InventoryTransaction  ${await prisma.inventoryTransaction.count()}`);
  console.log(`    Order                 ${await prisma.order.count()}`);
  console.log(`    OrderItem             ${await prisma.orderItem.count()}`);
  console.log(`    Review                ${await prisma.review.count()}`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
