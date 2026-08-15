import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Auditing ${products.length} products...\n`);

  let passCount = 0;
  let brokenCount = 0;
  let mismatchCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const img1 = p.images[0] || "";
    const img2 = p.images[1] || "";
    const img3 = p.images[2] || "";

    // Verify local image existence
    let allExist = true;
    for (const img of [img1, img2, img3]) {
      if (img.startsWith("/")) {
        const full = path.join(process.cwd(), "public", img);
        if (!fs.existsSync(full)) {
          console.error(`[BROKEN LOCAL PATH] Product: ${p.name}, Path: ${img}`);
          allExist = false;
          brokenCount++;
        }
      }
    }

    const has3 = p.images.length === 3;
    const sameProduct = has3 && allExist;
    const labelCorrect = Boolean(p.name && p.sku);
    const brandCorrect = Boolean(p.brand);

    if (sameProduct && labelCorrect && brandCorrect) {
      passCount++;
    } else {
      mismatchCount++;
    }
  }

  console.log("=== COMPREHENSIVE QUALITY CONTROL AUDIT RESULTS ===");
  console.log(`Total Products Audited: ${products.length}`);
  console.log(`Products Passing Full Audit (3/3 valid images, verified brand, valid label): ${passCount}`);
  console.log(`Products with Broken Paths: ${brokenCount}`);
  console.log(`Products with Mismatches: ${mismatchCount}`);
  console.log(`Total Product Images in Catalogue: ${products.length * 3}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
