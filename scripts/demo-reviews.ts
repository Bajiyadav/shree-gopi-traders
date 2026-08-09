/**
 * DEMO PRODUCT REVIEWS
 *
 *   npm run demo:reviews                        # generate (local)
 *   npm run demo:reviews -- --clear             # remove them
 *   npm run demo:reviews -- --remote-demo       # allow a remote *demo* database
 *
 * Reviews are written ONLY by demo customers who actually received the product
 * — someone with a DELIVERED order containing it. A review from an account that
 * never bought the item is the exact pattern a fake-review filter looks for,
 * and it would make the demo look worse, not better.
 *
 * These are illustrative content for demonstrating the reviews UI. They are not
 * real customer feedback and must never be presented as such. The live store
 * carries no reviews until real buyers write them: publishing invented ones
 * would be a misleading practice under the CCPA's Guidelines for Prevention of
 * Misleading Advertisements, and BIS IS 19000:2022 requires that a published
 * review come from a genuine purchaser.
 *
 * The same two-condition guard as demo:orders applies — remote databases are
 * refused unless named as a demo database AND --remote-demo is given.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CLEAR = process.argv.includes("--clear");
const REMOTE_OK = process.argv.includes("--remote-demo");

const DEMO_SUFFIX = "@demo.example";

/** Reviews per product, when there are enough real buyers to draw from. */
const MIN_PER_PRODUCT = 10;
const MAX_PER_PRODUCT = 15;

const url = process.env.DATABASE_URL ?? "";
const dbName = url.match(/\/([^/?]+)(\?|$)/)?.[1] ?? "";
const isRemote = /neon\.tech|amazonaws|supabase|render\.com/.test(url);

if (isRemote && !(/demo/i.test(dbName) && REMOTE_OK)) {
  console.error(`
  Refusing to write demo reviews to a remote database.

  Target database : ${dbName || "(none)"}
  Named as demo   : ${/demo/i.test(dbName) ? "yes" : "NO"}
  --remote-demo   : ${REMOTE_OK ? "given" : "NOT GIVEN"}

  These reviews are illustrative, not real customer feedback. On the live
  store they would be invented testimonials attached to real products.
`);
  process.exit(1);
}

// ── Deterministic RNG ─────────────────────────────────────────
let seedState = 20260809;
function random() {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randomInt = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const randomFrom = <T,>(a: readonly T[]): T => a[Math.floor(random() * a.length)];

/**
 * Written from a salon owner's point of view — repeat ordering, per-unit rates,
 * packaging, delivery. No brand names, no medical or efficacy claims, and
 * nothing asserting the product is genuine or the cheapest available.
 */
const POSITIVE = [
  "Consistent quality across repeat orders. We reorder this every month.",
  "Good value at the 10+ rate. Packaging arrived sealed and intact.",
  "Our stylists prefer this one. Ordering again next cycle.",
  "Works well for daily salon use and the bulk rate makes sense for us.",
  "Delivery was quick and the cartons were properly sealed.",
  "We have been buying this for our parlour for a few months now. No complaints.",
  "The 25+ tier brought the per-unit cost down nicely for our academy.",
  "Standard product, fair rate, reliable supply. That is what we need.",
  "Ordered for two branches. Both received on time.",
  "Quality has been steady order to order, which matters more than the price.",
  "Bulk pricing is clear and the invoice was easy to reconcile.",
  "Restocked three times now. Same quality each time.",
  "Good for high-volume days. We go through these quickly.",
  "Packaging is sturdy enough for our storeroom shelves.",
  "Reasonable per-unit rate once you reach the second tier.",
];

const MIXED = [
  "Does the job. Would like a larger pack size for our volume.",
  "Fine for the price. Delivery took a little longer than expected.",
  "Decent quality. We would order more if the 50+ rate improved.",
  "Works for us, though the packaging could be sturdier in transit.",
  "Acceptable. We use it for routine work rather than premium services.",
  "Reasonable, but we are still comparing against our previous supplier.",
];

async function main() {
  console.log(`\n  Database: ${dbName || "local"}${isRemote ? "  (remote)" : ""}`);

  // Only ever touch reviews written by demo accounts.
  const demoCustomers = await prisma.customer.findMany({
    where: { email: { endsWith: DEMO_SUFFIX } },
    select: { id: true },
  });
  const demoIds = demoCustomers.map((c) => c.id);

  if (!demoIds.length) {
    console.error("  No demo customers found. Run `npm run demo:orders` first.\n");
    process.exitCode = 1;
    return;
  }

  const touched = await prisma.review.findMany({
    where: { customerId: { in: demoIds } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const removed = await prisma.review.deleteMany({ where: { customerId: { in: demoIds } } });
  if (removed.count) console.log(`  Removed ${removed.count} existing demo review(s).`);

  if (CLEAR) {
    await recompute(touched.map((t) => t.productId));
    console.log("  Cleared.\n");
    await prisma.$disconnect();
    return;
  }

  // Who genuinely received what.
  const delivered = await prisma.orderItem.findMany({
    where: {
      order: { status: "DELIVERED", customerId: { in: demoIds } },
    },
    select: { productId: true, order: { select: { customerId: true, createdAt: true } } },
  });

  const buyersByProduct = new Map<string, Map<string, Date>>();
  for (const item of delivered) {
    const buyers = buyersByProduct.get(item.productId) ?? new Map<string, Date>();
    // Keep the earliest delivery, so the review cannot predate the purchase.
    const seen = buyers.get(item.order.customerId);
    if (!seen || item.order.createdAt < seen) buyers.set(item.order.customerId, item.order.createdAt);
    buyersByProduct.set(item.productId, buyers);
  }

  const rows: { productId: string; customerId: string; rating: number; comment: string; createdAt: Date; status: "APPROVED" }[] = [];
  let short = 0;

  for (const [productId, buyers] of buyersByProduct) {
    const pool = [...buyers.entries()];
    const target = Math.min(randomInt(MIN_PER_PRODUCT, MAX_PER_PRODUCT), pool.length);
    if (pool.length < MIN_PER_PRODUCT) short++;

    // Shuffle deterministically, then take the first `target` — one review per
    // customer per product, which is what the storefront expects.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (const [customerId, boughtAt] of pool.slice(0, target)) {
      // Weighted towards satisfied, with a genuine minority of 3s. A wall of
      // five stars is the least believable distribution there is.
      const roll = random();
      const rating = roll < 0.55 ? 5 : roll < 0.85 ? 4 : 3;
      const comment = rating >= 4 ? randomFrom(POSITIVE) : randomFrom(MIXED);

      // Written some days after delivery, never before.
      const createdAt = new Date(boughtAt.getTime() + randomInt(3, 40) * 86400000);
      rows.push({
        productId,
        customerId,
        rating,
        comment,
        createdAt: createdAt > new Date() ? new Date() : createdAt,
        status: "APPROVED",
      });
    }
  }

  await prisma.review.createMany({ data: rows });
  await recompute([...buyersByProduct.keys()]);

  const dist = new Map<number, number>();
  for (const r of rows) dist.set(r.rating, (dist.get(r.rating) ?? 0) + 1);
  const avg = rows.reduce((s, r) => s + r.rating, 0) / (rows.length || 1);

  console.log(`
  Reviews written : ${rows.length}
  Products covered: ${buyersByProduct.size}
  Average rating  : ${avg.toFixed(2)}`);
  for (const stars of [5, 4, 3]) {
    const n = dist.get(stars) ?? 0;
    console.log(`    ${stars}★ ${String(n).padStart(4)}  ${"█".repeat(Math.round((n / rows.length) * 40))}`);
  }
  if (short) {
    console.log(`\n  ${short} product(s) got fewer than ${MIN_PER_PRODUCT} — not enough
  demo customers have a delivered order containing them. Reviews are only
  written by accounts that actually received the product.`);
  }
  console.log();
  await prisma.$disconnect();
}

/** Product.ratingAvg / ratingCount are denormalised copies of the review table. */
async function recompute(productIds: string[]) {
  for (const productId of [...new Set(productIds)]) {
    const agg = await prisma.review.aggregate({
      where: { productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)),
        ratingCount: agg._count._all,
      },
    });
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
