/**
 * Take the unverified-stock products off the storefront.
 *
 * These are the products seeded by scripts/seed-85-real-products.ts without
 * variants, later repaired by scripts/backfill-missing-variants.ts and then
 * zeroed by scripts/reset-placeholder-inventory.ts because their opening
 * balance was a placeholder rather than a counted quantity. They are visible
 * but unbuyable, so they are being hidden until real stock is entered.
 *
 * SCOPE — this script writes exactly one column, Product.isActive.
 * It does not touch images, variants, inventory, transactions, orders,
 * order items, ratings, prices or Cloudinary. Nothing is deleted.
 *
 * A product is hidden only if ALL THREE hold:
 *   1. it is currently active,
 *   2. every one of its variants has stock <= 0, AND
 *   3. it carries the backfill inventory transaction.
 * Condition 3 is what protects genuinely sold-out products: a real sell-out
 * has no backfill marker and is left visible.
 *
 * Reversible: the pre-change state of every affected row is written to
 * scripts/deactivated-products-manifest.json, and --revert restores from it.
 *
 * Run with: npx tsx scripts/deactivate-unverified-stock-products.ts [--apply|--revert]
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const REVERT = process.argv.includes("--revert");

const BACKFILL_REASON = "Variant backfill — opening balance, pending physical stock count";
const MANIFEST = path.join(process.cwd(), "scripts", "deactivated-products-manifest.json");

/** Refuses to write while another process is mid-burst on the catalogue. */
async function assertNoConcurrentWriter() {
  const r = await prisma.$queryRaw<{ mins: number; recent: number }[]>`
    SELECT EXTRACT(EPOCH FROM (NOW() - (SELECT MAX("updatedAt") FROM "Product")))/60 AS mins,
           (SELECT COUNT(*)::int FROM "Product" WHERE "updatedAt" > NOW() - INTERVAL '3 minutes') AS recent
  `;
  const mins = Math.round(Number(r[0].mins));
  console.log(`Concurrent-writer check: last Product write ${mins} min ago, ${r[0].recent} rows changed in last 3 min`);
  if (Number(r[0].recent) > 0) {
    throw new Error(
      `Another process wrote to Product within the last 3 minutes. Refusing to run — stop the other session first.`
    );
  }
}

async function main() {
  if (REVERT) {
    if (!fs.existsSync(MANIFEST)) throw new Error(`No manifest at ${MANIFEST} — nothing to revert.`);
    const rows: { id: string; sku: string; wasActive: boolean }[] = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const restore = rows.filter((r) => r.wasActive).map((r) => r.id);
    console.log(`Reverting ${restore.length} product(s) to isActive = true`);
    await assertNoConcurrentWriter();
    const res = await prisma.product.updateMany({ where: { id: { in: restore } }, data: { isActive: true } });
    console.log(`  restored: ${res.count}`);
    console.log(`  active products now: ${await prisma.product.count({ where: { isActive: true } })}`);
    return;
  }

  console.log(APPLY ? "APPLYING CHANGES\n" : "DRY RUN — pass --apply to write\n");

  const targets = await prisma.product.findMany({
    where: {
      isActive: true,
      variants: { every: { inventory: { stock: { lte: 0 } } } },
      AND: [{ variants: { some: { inventory: { transactions: { some: { reason: BACKFILL_REASON } } } } } }],
    },
    select: { id: true, sku: true, name: true, isActive: true },
    orderBy: { sku: "asc" },
  });

  // A genuine sell-out has no backfill marker; confirm none are being caught.
  const genuineSellOuts = await prisma.product.count({
    where: {
      isActive: true,
      variants: { every: { inventory: { stock: { lte: 0 } } } },
      NOT: { variants: { some: { inventory: { transactions: { some: { reason: BACKFILL_REASON } } } } } },
    },
  });

  console.log(`Products to hide (unverified stock)      : ${targets.length}`);
  console.log(`Genuine sell-outs left visible           : ${genuineSellOuts}`);
  console.log(`Active products before                   : ${await prisma.product.count({ where: { isActive: true } })}`);
  console.log("\nFirst 5:");
  targets.slice(0, 5).forEach((t) => console.log(`    ${t.sku.padEnd(32)} ${t.name.slice(0, 44)}`));

  if (!APPLY || targets.length === 0) return;

  await assertNoConcurrentWriter();

  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(targets.map((t) => ({ id: t.id, sku: t.sku, name: t.name, wasActive: t.isActive })), null, 2)
  );
  console.log(`\nManifest written: ${path.relative(process.cwd(), MANIFEST)} (revert with --revert)`);

  const res = await prisma.product.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { isActive: false },
  });

  console.log(`\n  Products hidden                        : ${res.count}`);
  console.log(`  VERIFY active products now             : ${await prisma.product.count({ where: { isActive: true } })}`);
  console.log(`  VERIFY active with zero stock remaining : ${await prisma.product.count({ where: { isActive: true, variants: { every: { inventory: { stock: { lte: 0 } } } } } })}`);
  console.log(`  VERIFY orders untouched                : ${await prisma.order.count()} orders / ${await prisma.orderItem.count()} items`);
}

main()
  .catch((e) => {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
