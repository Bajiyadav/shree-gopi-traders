/**
 * SAFETY FIX — zero the unverified placeholder stock left by the variant backfill.
 *
 * scripts/backfill-missing-variants.ts gave every newly created variant an
 * opening balance of 25 units so the product would stop showing as out of
 * stock. That number was never a physical count — it was a placeholder, and
 * leaving it in place lets the storefront sell units that may not exist.
 *
 * This resets those balances to 0 so the catalogue tells the truth: the
 * products stay ACTIVE and visible, but read as out of stock until the owner
 * enters a real count through /admin/inventory.
 *
 * It mirrors adjustInventoryAction (src/actions/inventory.ts): an ADJUSTMENT
 * transaction carrying the signed delta, stock never below zero. The original
 * backfill transaction is left untouched, so the audit trail still shows where
 * the placeholder came from and that a count is still outstanding.
 *
 * Scope is deliberately narrow. A variant is touched only if BOTH hold:
 *   1. it carries the backfill transaction reason, AND
 *   2. its stock is still exactly the placeholder quantity (25).
 * Anything that has since moved is reported and left alone.
 *
 * Nothing is deleted. No product, variant, order, order item, image or
 * transaction is removed, and no product is deactivated.
 *
 * Run with: npx tsx scripts/reset-placeholder-inventory.ts [--apply]
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** Written by scripts/backfill-missing-variants.ts — matched exactly. */
const BACKFILL_REASON = "Variant backfill — opening balance, pending physical stock count";
const PLACEHOLDER_QTY = 25;
const RESET_REASON =
  "Placeholder opening balance reset to 0 — unverified stock, pending physical count. " +
  "Enter the real quantity via /admin/inventory.";

const MANIFEST = path.join(process.cwd(), "scripts", "placeholder-inventory-manifest.json");

async function main() {
  console.log(APPLY ? "APPLYING CHANGES\n" : "DRY RUN — pass --apply to write\n");

  // ══ 1. The complete affected set, recorded before anything changes ══
  const backfilled = await prisma.inventoryTransaction.findMany({
    where: { reason: BACKFILL_REASON },
    include: {
      inventory: {
        include: {
          productVariant: {
            select: {
              id: true,
              sku: true,
              productId: true,
              product: { select: { name: true, isActive: true } },
            },
          },
        },
      },
    },
  });

  const rows = backfilled.map((t) => ({
    productId: t.inventory.productVariant.productId,
    productName: t.inventory.productVariant.product.name,
    productIsActive: t.inventory.productVariant.product.isActive,
    variantId: t.inventory.productVariant.id,
    sku: t.inventory.productVariant.sku,
    inventoryId: t.inventoryId,
    currentStock: t.inventory.stock,
    transactionReason: t.reason,
  }));

  const active = rows.filter((r) => r.productIsActive);
  console.log(`Placeholder variants found          : ${rows.length}`);
  console.log(`  belonging to ACTIVE products      : ${active.length}`);
  console.log(`  belonging to inactive products    : ${rows.length - active.length}`);

  fs.writeFileSync(MANIFEST, JSON.stringify(rows, null, 2));
  console.log(`\nManifest written: ${path.relative(process.cwd(), MANIFEST)}`);

  // ══ 2. Narrow to what is genuinely still the placeholder ══
  const target = rows.filter((r) => r.currentStock === PLACEHOLDER_QTY);
  const moved = rows.filter((r) => r.currentStock !== PLACEHOLDER_QTY);

  console.log(`\nStill at the placeholder ${PLACEHOLDER_QTY} units    : ${target.length}  → will be zeroed`);
  if (moved.length) {
    console.log(`Stock has since moved — LEFT ALONE  : ${moved.length}`);
    moved.forEach((r) => console.log(`    ${r.sku.padEnd(34)} stock=${r.currentStock}  ${r.productName.slice(0, 34)}`));
  }

  console.log("\nFirst 5 to be zeroed:");
  target.slice(0, 5).forEach((r) =>
    console.log(`    ${r.sku.padEnd(34)} ${r.currentStock} → 0   ${r.productName.slice(0, 34)}`)
  );

  if (!APPLY || target.length === 0) return;

  // ══ 3. Apply, the way adjustInventoryAction would ══
  // Attribute the adjustment to the admin account so the trail names a person.
  const admin = await prisma.admin.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });

  const inventoryIds = target.map((r) => r.inventoryId);
  await prisma.$transaction(
    [
      prisma.inventory.updateMany({ where: { id: { in: inventoryIds } }, data: { stock: 0 } }),
      prisma.inventoryTransaction.createMany({
        data: target.map((r) => ({
          inventoryId: r.inventoryId,
          action: "ADJUSTMENT" as const,
          quantity: -PLACEHOLDER_QTY, // signed delta, exactly as ADJUSTMENT expects
          reason: RESET_REASON,
          adminId: admin?.id ?? null,
        })),
      }),
    ],
    { timeout: 60_000, maxWait: 60_000 }
  );

  console.log(`\n  Inventory rows zeroed        : ${target.length}`);
  console.log(`  ADJUSTMENT transactions added: ${target.length}`);

  // ══ 4. Verify ══
  const stillPlaceholder = await prisma.inventoryTransaction.count({ where: { reason: BACKFILL_REASON } });
  const activeAt25 = await prisma.inventory.count({
    where: {
      stock: PLACEHOLDER_QTY,
      productVariant: { product: { isActive: true } },
      transactions: { some: { reason: BACKFILL_REASON } },
    },
  });
  const resetTxns = await prisma.inventoryTransaction.count({ where: { reason: RESET_REASON } });

  console.log(`\n  VERIFY original backfill transactions preserved : ${stillPlaceholder}`);
  console.log(`  VERIFY active variants still at ${PLACEHOLDER_QTY} placeholder : ${activeAt25}`);
  console.log(`  VERIFY reset ADJUSTMENT transactions written    : ${resetTxns}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
