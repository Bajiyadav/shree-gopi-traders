import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const inactiveCount = await prisma.product.count({ where: { isActive: false } });
  const totalCount = await prisma.product.count();

  console.log("=== ACTIVE STOREFRONT CATALOGUE AUDIT ===");
  console.log(`Active Products Count: ${activeProducts.length} (Expected: 130)`);
  console.log(`Inactive Products Preserved in DB: ${inactiveCount} (Expected: 78)`);
  console.log(`Total Database Records: ${totalCount} (Expected: 208)`);

  let count3 = 0;
  let countLess3 = 0;
  let countMore3 = 0;
  let totalImages = 0;
  let brokenPaths = 0;

  for (const p of activeProducts) {
    const len = p.images.length;
    totalImages += len;

    if (len === 3) count3++;
    else if (len < 3) countLess3++;
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

  console.log("\n--- Active Image Distribution ---");
  console.log(`Active Products with exactly 3 images: ${count3} / 130`);
  console.log(`Active Products with < 3 images: ${countLess3}`);
  console.log(`Active Products with > 3 images: ${countMore3}`);
  console.log(`Expected Active Gallery Images: 390 (130 x 3)`);
  console.log(`Actual Active Gallery Images: ${totalImages}`);
  console.log(`Broken Local File Paths: ${brokenPaths}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
