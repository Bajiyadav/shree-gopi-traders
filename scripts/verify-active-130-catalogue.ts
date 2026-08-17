/**
 * Active storefront catalogue audit.
 *
 * The catalogue was expanded from 130 to 200 active products (commit d4483ca);
 * the expectations below track that, and the script now exits non-zero when
 * reality disagrees instead of printing a stale target beside a live number.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

/** The published catalogue: 200 active products carrying 3 gallery views each. */
const EXPECTED_ACTIVE = 200;
const IMAGES_PER_PRODUCT = 3;
const EXPECTED_IMAGES = EXPECTED_ACTIVE * IMAGES_PER_PRODUCT; // 600

let failures = 0;

function check(label: string, actual: number, expected: number) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "✓" : "✗"} ${label}: ${actual} (expected ${expected})`);
}

async function main() {
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const inactiveCount = await prisma.product.count({ where: { isActive: false } });
  const totalCount = await prisma.product.count();

  console.log("=== ACTIVE STOREFRONT CATALOGUE AUDIT ===");
  check("Active products", activeProducts.length, EXPECTED_ACTIVE);
  console.log(`  · Inactive products preserved in DB: ${inactiveCount}`);
  console.log(`  · Total product records: ${totalCount}`);

  let count3 = 0;
  let countLess3 = 0;
  let countMore3 = 0;
  let totalImages = 0;
  let brokenPaths = 0;

  for (const p of activeProducts) {
    const len = p.images.length;
    totalImages += len;

    if (len === IMAGES_PER_PRODUCT) count3++;
    else if (len < IMAGES_PER_PRODUCT) countLess3++;
    else countMore3++;

    for (const img of p.images) {
      if (img.startsWith("/")) {
        const full = path.join(process.cwd(), "public", img);
        if (!fs.existsSync(full)) {
          console.error(`[BROKEN] Product ${p.sku} (${p.name}): ${img}`);
          brokenPaths++;
        }
      }
    }
  }

  console.log("\n--- Active image distribution ---");
  check(`Active products with exactly ${IMAGES_PER_PRODUCT} images`, count3, EXPECTED_ACTIVE);
  check("Active products with too few images", countLess3, 0);
  check("Active products with too many images", countMore3, 0);
  check("Active gallery images", totalImages, EXPECTED_IMAGES);
  check("Broken local file paths", brokenPaths, 0);

  console.log(failures === 0 ? "\nRESULT: PASS" : `\nRESULT: FAIL — ${failures} check(s) failed`);
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
