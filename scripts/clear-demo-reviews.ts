/**
 * Removes the seeded demo reviews and resets the ratings they produced.
 *
 * Run this before real customers see the site, so fabricated review text is
 * never presented as genuine customer feedback.
 *
 *   npm run demo:clear-reviews          # show what would be removed
 *   npm run demo:clear-reviews -- --yes # actually remove them
 *
 * Deleting the review rows alone is not enough: Product.ratingAvg and
 * Product.ratingCount are denormalised copies, so this recomputes them from
 * whatever APPROVED reviews remain (zeroing them when none do). Skipping that
 * step would leave products displaying a star rating with no reviews behind it.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Identifies the accounts the seed creates. Every seeded business uses the
 * reserved `.example` TLD (RFC 2606, so it can never be a real address), plus
 * the one named demo login. Anything else is treated as a real customer and
 * left alone.
 */
const DEMO_ACCOUNT_FILTER = {
  OR: [
    { email: { endsWith: ".example" } },
    { email: "demo@shreegopitraders.com" },
  ],
};

async function main() {
  const confirmed = process.argv.includes("--yes");

  const demoCustomers = await prisma.customer.findMany({
    where: DEMO_ACCOUNT_FILTER,
    select: { id: true, email: true },
  });

  const totalReviews = await prisma.review.count();
  const demoReviews = await prisma.review.count({
    where: { customerId: { in: demoCustomers.map((c) => c.id) } },
  });
  const realReviews = totalReviews - demoReviews;

  console.log(`Reviews in database : ${totalReviews}`);
  console.log(`  from demo accounts: ${demoReviews}`);
  console.log(`  from real accounts: ${realReviews}`);

  if (demoReviews === 0) {
    console.log("\nNothing to remove.");
    return;
  }

  if (!confirmed) {
    console.log(`\nDry run — nothing changed.`);
    console.log(`Re-run with --yes to delete ${demoReviews} demo review(s) and recompute ratings.`);
    if (realReviews > 0) {
      console.log(`(${realReviews} genuine review(s) will be kept.)`);
    }
    return;
  }

  const deleted = await prisma.review.deleteMany({
    where: { customerId: { in: demoCustomers.map((c) => c.id) } },
  });

  // Recompute every product's rating from the APPROVED reviews that remain.
  const products = await prisma.product.findMany({ select: { id: true } });
  const surviving = await prisma.review.groupBy({
    by: ["productId"],
    where: { status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const byProduct = new Map(surviving.map((r) => [r.productId, r]));

  let reset = 0;
  for (const product of products) {
    const row = byProduct.get(product.id);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        ratingAvg: row ? Number((row._avg.rating ?? 0).toFixed(2)) : 0,
        ratingCount: row ? row._count._all : 0,
      },
    });
    if (!row) reset++;
  }

  console.log(`\nDeleted ${deleted.count} demo review(s).`);
  console.log(`Recomputed ratings on ${products.length} product(s); ${reset} now show no rating.`);
  console.log("The storefront will show 'No reviews' until real customers leave one.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
