/**
 * BUG FIX — rebuild the denormalised rating columns from the review table.
 *
 * Product.ratingAvg / Product.ratingCount are cached copies of the APPROVED
 * reviews for that product. src/actions/reviews.ts keeps them correct whenever
 * a review is moderated or deleted, but scripts/seed-reviews-all-products.mjs
 * inserted 779 reviews straight through prisma.review.create() and never ran
 * the rollup — so 120 products with approved reviews still read ratingCount 0
 * and showed no stars anywhere on the storefront.
 *
 * This recomputes both columns for every product from APPROVED reviews only.
 * PENDING and REJECTED reviews are excluded, exactly as the moderation action
 * does. Safe to re-run: it only writes rows that are actually wrong.
 *
 * Run with: npx tsx scripts/recompute-product-ratings.ts [--apply]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function drift() {
  return prisma.$queryRaw<
    { id: string; name: string; storedCount: number; realCount: number; storedAvg: string; realAvg: string | null }[]
  >`
    SELECT p.id,
           p.name,
           p."ratingCount"                            AS "storedCount",
           COALESCE(r.cnt, 0)::int                    AS "realCount",
           p."ratingAvg"::text                        AS "storedAvg",
           COALESCE(r.avg, 0)::text                   AS "realAvg"
    FROM "Product" p
    LEFT JOIN (
      SELECT "productId",
             COUNT(*)::int              AS cnt,
             ROUND(AVG(rating)::numeric, 2) AS avg
      FROM "Review"
      WHERE status = 'APPROVED'
      GROUP BY "productId"
    ) r ON r."productId" = p.id
    WHERE p."ratingCount" IS DISTINCT FROM COALESCE(r.cnt, 0)
       OR p."ratingAvg"   IS DISTINCT FROM COALESCE(r.avg, 0)
    ORDER BY COALESCE(r.cnt, 0) DESC
  `;
}

async function main() {
  console.log(APPLY ? "APPLYING CHANGES\n" : "DRY RUN — pass --apply to write\n");

  const before = await drift();
  console.log(`Products whose cached rating disagrees with their reviews: ${before.length}`);
  before.slice(0, 10).forEach((p) =>
    console.log(
      `  ${p.name.slice(0, 44).padEnd(46)} count ${p.storedCount} → ${p.realCount}   avg ${p.storedAvg} → ${p.realAvg}`
    )
  );
  if (before.length > 10) console.log(`  … and ${before.length - 10} more`);

  if (!APPLY) return;

  // One statement, so a slow pooled connection cannot leave the catalogue
  // half-rebuilt the way a per-product loop would.
  const updated = await prisma.$executeRaw`
    UPDATE "Product" p
    SET "ratingCount" = COALESCE(r.cnt, 0),
        "ratingAvg"   = COALESCE(r.avg, 0)
    FROM (
      SELECT p2.id,
             COUNT(rv.id)::int                  AS cnt,
             ROUND(AVG(rv.rating)::numeric, 2)  AS avg
      FROM "Product" p2
      LEFT JOIN "Review" rv ON rv."productId" = p2.id AND rv.status = 'APPROVED'
      GROUP BY p2.id
    ) r
    WHERE r.id = p.id
      AND (p."ratingCount" IS DISTINCT FROM COALESCE(r.cnt, 0)
        OR p."ratingAvg"   IS DISTINCT FROM COALESCE(r.avg, 0))
  `;
  console.log(`\n  Rows updated: ${updated}`);

  const after = await drift();
  const approved = await prisma.review.count({ where: { status: "APPROVED" } });
  const nonApproved = await prisma.review.count({ where: { status: { not: "APPROVED" } } });
  const summed = await prisma.product.aggregate({ _sum: { ratingCount: true } });

  console.log(`\n  VERIFY products still drifting        : ${after.length}`);
  console.log(`  VERIFY approved reviews in table      : ${approved}`);
  console.log(`  VERIFY sum of every Product.ratingCount: ${summed._sum.ratingCount}`);
  console.log(`  VERIFY non-approved reviews (excluded) : ${nonApproved}`);
  if (after.length > 0) {
    console.log("\n  STILL WRONG:");
    after.forEach((p) => console.log(`    ${p.name}: ${p.storedCount} vs ${p.realCount}`));
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
