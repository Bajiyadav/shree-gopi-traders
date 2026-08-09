/**
 * APPLY A DISCOUNT TO THE CATALOGUE
 *
 *   npm run pricing:discount -- --spread              # dry run, mixed 5/8/15%
 *   npm run pricing:discount -- --spread --apply      # write it
 *   npm run pricing:discount -- --pct=10 --apply      # one rate everywhere
 *   npm run pricing:discount -- --pct=15 --category=hair-care --apply
 *   npm run pricing:discount -- --clear --apply       # back to list price
 *
 * WHY IT MOVES THE TIERS, NOT salePrice
 * resolveCartPricing() picks the wholesale tier first and only falls back to
 * salePrice when no tier matches:
 *
 *   const unitPrice = bestTier ? bestTier.pricePerUnit : variant.salePrice ?? variant.price;
 *
 * Every variant in this catalogue has a tier starting at quantity 1, so a tier
 * always matches and salePrice is never read. Writing a markdown there would
 * paint a "15% off" badge on a product that still charges full price at
 * checkout — a discount the customer can see but never receives.
 *
 * So the whole ladder is scaled. The list price is left alone as the reference
 * the saving is measured against, and salePrice is kept in step with tier 1 so
 * nothing downstream disagrees.
 *
 * The ladder is scaled rather than having its first rung cut, because cutting
 * only tier 1 can push it below tier 3 — at which point buying ten costs more
 * per unit than buying one, and the wholesale ladder is upside down.
 *
 * List prices are never raised. Inflating an MRP so a discount appears larger
 * would manufacture a saving that was never offered.
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);

const APPLY = args.includes("--apply");
const CLEAR = args.includes("--clear");
const SPREAD = args.includes("--spread");
const PCT = Number(args.find((a) => a.startsWith("--pct="))?.split("=")[1] ?? NaN);
const CATEGORY = args.find((a) => a.startsWith("--category="))?.split("=")[1];

/** The three rates, rotated across products so the catalogue is not uniform. */
const SPREAD_RATES = [5, 8, 15];

if (!CLEAR && !SPREAD && !(PCT > 0 && PCT < 90)) {
  console.error(`
  Choose what to apply:

    --spread            rotate ${SPREAD_RATES.join("% / ")}% across the catalogue
    --pct=10            one rate everywhere
    --clear             remove every markdown, back to list price

  Optional: --category=<slug> to scope it, --apply to write.
`);
  process.exit(1);
}

const money = (n: number) => `Rs ${n.toFixed(2)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const dbName = (process.env.DATABASE_URL ?? "").match(/\/([^/?]+)(\?|$)/)?.[1] ?? "local";

  const variants = await prisma.productVariant.findMany({
    where: CATEGORY ? { product: { category: { slug: CATEGORY } } } : {},
    select: {
      id: true, name: true, price: true, salePrice: true,
      product: { select: { name: true, slug: true, category: { select: { slug: true } } } },
      wholesaleTiers: { select: { id: true, minQty: true, maxQty: true, pricePerUnit: true }, orderBy: { minQty: "asc" } },
    },
    orderBy: { id: "asc" },
  });

  if (!variants.length) {
    console.error(`  No variants found${CATEGORY ? ` in category "${CATEGORY}"` : ""}.`);
    process.exitCode = 1;
    return;
  }

  // One rate per PRODUCT, not per variant, so a product's sizes stay coherent.
  const productSlugs = [...new Set(variants.map((v) => v.product.slug))].sort();
  const rateFor = new Map<string, number>();
  productSlugs.forEach((slug, i) => {
    rateFor.set(slug, CLEAR ? 0 : SPREAD ? SPREAD_RATES[i % SPREAD_RATES.length] : PCT);
  });

  type Change = {
    variantId: string; label: string; rate: number;
    list: number; fromTier1: number; toTier1: number;
    tiers: { id: string; to: Prisma.Decimal }[];
    salePrice: Prisma.Decimal | null;
  };
  const changes: Change[] = [];

  for (const v of variants) {
    const rate = rateFor.get(v.product.slug) ?? 0;
    const list = Number(v.price);
    const tier1 = v.wholesaleTiers.find((t) => t.minQty === 1);
    if (!tier1) continue; // nothing a shopper at quantity 1 would ever see

    // Scale from the LIST price, not from the current tier price, so re-running
    // this never compounds a discount on a discount.
    const ladderRatio = v.wholesaleTiers.map((t) => Number(t.pricePerUnit) / Number(tier1.pricePerUnit));
    const newTier1 = round2(list * (1 - rate / 100));

    const tiers = v.wholesaleTiers.map((t, i) => ({
      id: t.id,
      to: new Prisma.Decimal(round2(newTier1 * ladderRatio[i])),
    }));

    const wantSalePrice = rate > 0 ? new Prisma.Decimal(newTier1) : null;
    // Decimal comparison, not string. String(Decimal) drops trailing zeros, so
    // "179.4" never equalled "179.40" and every variant looked changed on a
    // re-run even when nothing had moved.
    const salePriceChanged =
      v.salePrice === null || wantSalePrice === null
        ? v.salePrice !== wantSalePrice
        : !v.salePrice.equals(wantSalePrice);

    const changed =
      tiers.some((t, i) => !t.to.equals(v.wholesaleTiers[i].pricePerUnit)) || salePriceChanged;

    if (!changed) continue;

    changes.push({
      variantId: v.id,
      label: `${v.product.name} / ${v.name}`,
      rate,
      list,
      fromTier1: Number(tier1.pricePerUnit),
      toTier1: newTier1,
      tiers,
      // Kept in step with tier 1 so the two never contradict each other, even
      // though the pricing path does not currently read it.
      salePrice: wantSalePrice,
    });
  }

  console.log(`\n  Database   : ${dbName}`);
  console.log(`  Scope      : ${CATEGORY ?? "whole catalogue"}  (${variants.length} variants)`);
  console.log(
    `  Applying   : ${CLEAR ? "clearing all markdowns" : SPREAD ? `${SPREAD_RATES.join("% / ")}% rotated by product` : `${PCT}% everywhere`}`
  );
  console.log(`  Changing   : ${changes.length} variant(s)\n`);

  const byRate = new Map<number, number>();
  for (const c of changes) byRate.set(c.rate, (byRate.get(c.rate) ?? 0) + 1);
  for (const [rate, n] of [...byRate].sort((a, b) => a[0] - b[0])) {
    console.log(`    ${String(rate).padStart(2)}% off → ${n} variant(s)`);
  }

  console.log(`\n  Examples:`);
  for (const c of changes.slice(0, 6)) {
    console.log(
      `    ${c.label.slice(0, 44).padEnd(46)}list ${money(c.list).padEnd(12)}` +
      `${money(c.fromTier1)} → ${money(c.toTier1)}  (${c.rate}% off)`
    );
  }

  if (!APPLY) {
    console.log(`\n  DRY RUN — nothing was written. Re-run with --apply.\n`);
    await prisma.$disconnect();
    return;
  }

  for (const c of changes) {
    await prisma.$transaction([
      ...c.tiers.map((t) =>
        prisma.wholesalePriceTier.update({ where: { id: t.id }, data: { pricePerUnit: t.to } })
      ),
      prisma.productVariant.update({
        where: { id: c.variantId },
        data: { salePrice: c.salePrice },
      }),
    ]);
  }

  console.log(`\n  Updated ${changes.length} variant(s).`);
  console.log(`  List prices were not touched — only what the customer is charged.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
