/**
 * BUG FIX — backfill purchasable variants for products seeded without them.
 *
 * scripts/seed-85-real-products.ts created 81 products with only a `basePrice`
 * and no ProductVariant, Inventory, or specs. Because the storefront prices and
 * sells through variants, every one of those products rendered as out of stock,
 * refused add-to-cart ("This product has no purchasable variants right now"),
 * and emitted invalid JSON-LD.
 *
 * This script repairs that data using ONLY the product's own recorded values:
 *
 *   variant price      ← Product.basePrice   (no price is invented)
 *   variant salePrice  ← Product.salePrice   (null stays null)
 *   variant weight     ← Product.weight
 *   variant SKU        ← "<product sku>-STD" (size stays encoded in the SKU)
 *
 * It also normalises off-convention SKUs onto the house prefixes already in use
 * (SGT / MDM / RCH) and replaces the seed script's 46-character stub
 * description with one built from the product's real brand and category.
 *
 * Idempotent: re-running makes no further changes.
 *
 * Run with: npx tsx scripts/backfill-missing-variants.ts [--apply]
 * Without --apply it performs a dry run and writes no changes.
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/**
 * Opening stock for a backfilled variant. These products have never had an
 * Inventory row, so there is no recorded count to preserve — this is a
 * deliberate, conservative opening balance that is logged as a RESTOCK
 * transaction so the adjustment is auditable and can be corrected after a
 * physical stock count.
 */
const OPENING_STOCK = 25;
const LOW_STOCK_THRESHOLD = 5;
const BACKFILL_REASON = "Variant backfill — opening balance, pending physical stock count";

/** Prefixes the catalogue's SKU convention already recognises. */
const HOUSE_PREFIX = "SGT";
const BRAND_PREFIX: Record<string, string> = {
  RICHLON: "RCH",
  RICHELON: "RCH",
  MDM: "MDM",
  "MDM HERBAL": "MDM",
};
const VALID_SKU = /^(SGT|MDM|RCH)-/;

/** Reads naturally in a sentence: "for professional <phrase> use". */
const CATEGORY_PHRASE: Record<string, string> = {
  "Hair Care": "hair care",
  "Hair Styling": "hair styling",
  "Hair Color & Treatment": "hair colour and treatment",
  "Facial Products": "facial and skin treatment",
  Waxing: "waxing and hair removal",
  "Skin Care": "skin care",
  "Hair Equipment": "salon equipment",
};

/**
 * Brings an off-convention SKU onto a house prefix without discarding it.
 * A Richelon SKU adopts the RCH prefix the brand already uses elsewhere in the
 * catalogue; anything else is prefixed with SGT, so the original brand and pack
 * size stay readable and searchable inside the new SKU.
 */
function normaliseSku(sku: string, brand: string | null): string {
  if (VALID_SKU.test(sku)) return sku;
  const mapped = brand ? BRAND_PREFIX[brand.toUpperCase()] : undefined;
  if (mapped) {
    // "RICH-WC-WAX-800" → "RCH-WC-WAX-800": swap the brand's own loose prefix.
    const withoutPrefix = sku.replace(/^[A-Z]+-/, "");
    return `${mapped}-${withoutPrefix}`;
  }
  return `${HOUSE_PREFIX}-${sku}`;
}

/**
 * A description built strictly from what the record already asserts — brand,
 * category and name. It makes no claim about size, ingredients or performance
 * that the database cannot support.
 */
function buildDescription(name: string, brand: string | null, categoryName: string): string {
  const phrase = CATEGORY_PHRASE[categoryName] ?? categoryName.toLowerCase();
  const house = brand ? `genuine ${brand} stock` : "genuine branded stock";
  return (
    `${name} is ${house} supplied by Shree Gopi Traders for professional ${phrase} use. ` +
    `Stocked for salons, parlours and barbershops, and dispatched in original manufacturer ` +
    `packaging with GST invoicing.`
  );
}

/** Retries a write a few times so a saturated connection pool is not fatal. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`    retry ${i}/${attempts - 1} — ${(err as Error).message.split("\n")[0]}`);
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function main() {
  console.log(APPLY ? "APPLYING CHANGES\n" : "DRY RUN — pass --apply to write\n");

  const broken = await prisma.product.findMany({
    where: { variants: { none: {} } },
    include: { category: { select: { name: true } } },
    orderBy: { sku: "asc" },
  });

  console.log(`Products with zero variants: ${broken.length}`);

  // Guard against a normalised SKU colliding with one already in the table.
  const existingSkus = new Set((await prisma.product.findMany({ select: { sku: true } })).map((p) => p.sku));
  const existingVariantSkus = new Set(
    (await prisma.productVariant.findMany({ select: { sku: true } })).map((v) => v.sku)
  );

  let renamed = 0;
  let variantsCreated = 0;
  let descriptionsRewritten = 0;
  const collisions: string[] = [];

  for (const p of broken) {
    let sku = p.sku;

    // ── 1. SKU onto the house convention ──────────────────────
    const target = normaliseSku(p.sku, p.brand);
    if (target !== p.sku) {
      if (existingSkus.has(target)) {
        collisions.push(`${p.sku} → ${target} (taken)`);
      } else {
        if (APPLY) await prisma.product.update({ where: { id: p.id }, data: { sku: target } });
        existingSkus.delete(p.sku);
        existingSkus.add(target);
        sku = target;
        renamed++;
      }
    }

    // ── 2. The purchasable variant, priced from the product ───
    let variantSku = `${sku}-STD`;
    let n = 2;
    while (existingVariantSkus.has(variantSku)) variantSku = `${sku}-STD${n++}`;
    existingVariantSkus.add(variantSku);

    if (APPLY) {
      // The catalogue database is remote and pooled; the default 2s maxWait
      // starves under a long backfill loop, so give the transaction room and
      // retry rather than leaving a product half-repaired.
      await withRetry(() => prisma.$transaction(async (tx) => {
        const variant = await tx.productVariant.create({
          data: {
            productId: p.id,
            name: "Standard Pack",
            sku: variantSku,
            price: p.basePrice,          // the product's own recorded price
            salePrice: p.salePrice,      // null stays null — no markdown invented
            weight: p.weight,
            isActive: true,
          },
        });
        const inventory = await tx.inventory.create({
          data: {
            productVariantId: variant.id,
            stock: OPENING_STOCK,
            lowStockThreshold: LOW_STOCK_THRESHOLD,
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inventory.id,
            action: "RESTOCK",
            quantity: OPENING_STOCK,
            reason: BACKFILL_REASON,
          },
        });
      }, { maxWait: 30_000, timeout: 30_000 }));
    }
    variantsCreated++;

    // ── 3. Replace the seed script's stub description ─────────
    if ((p.description?.length ?? 0) < 80) {
      const description = buildDescription(p.name, p.brand, p.category.name);
      if (APPLY) await prisma.product.update({ where: { id: p.id }, data: { description } });
      descriptionsRewritten++;
    }
  }

  // The one product that has a variant but still carries a short description.
  const shortElsewhere = await prisma.product.findMany({
    where: { variants: { some: {} }, NOT: { name: { startsWith: "E2E Test" } } },
    include: { category: { select: { name: true } } },
  });
  for (const p of shortElsewhere) {
    if ((p.description?.length ?? 0) >= 80) continue;
    const description = buildDescription(p.name, p.brand, p.category.name);
    if (APPLY) await prisma.product.update({ where: { id: p.id }, data: { description } });
    descriptionsRewritten++;
  }

  console.log(`\n  SKUs normalised onto SGT/MDM/RCH : ${renamed}`);
  console.log(`  Variants created (+inventory)     : ${variantsCreated}`);
  console.log(`  Stub descriptions rewritten       : ${descriptionsRewritten}`);
  console.log(`  Opening stock per variant         : ${OPENING_STOCK}`);
  if (collisions.length) {
    console.log(`\n  SKU COLLISIONS (left unchanged):`);
    collisions.forEach((c) => console.log(`    ${c}`));
  }

  if (APPLY) {
    const remaining = await prisma.product.count({ where: { variants: { none: {} } } });
    const activeUnbuyable = await prisma.product.count({
      where: { isActive: true, variants: { none: { isActive: true } } },
    });
    console.log(`\n  VERIFY products with zero variants        : ${remaining}`);
    console.log(`  VERIFY active with no purchasable variant : ${activeUnbuyable}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
