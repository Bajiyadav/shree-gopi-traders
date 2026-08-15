import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const TARGET_16_BRANDS = [
  "L'OREAL",
  "MATRIX",
  "BIOLAGE",
  "RAAGA",
  "KRONE",
  "DREAMRON",
  "BIO KERATIN",
  "ASTA BERRY",
  "LILIUM",
  "AROMA MAGIC",
  "RICHLON",
  "RICA",
  "STREAX",
  "SCHWARZKOPF",
  "WELLA",
  "SP"
];

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Total products in database: ${products.length}`);

  let with1 = 0;
  let with2 = 0;
  let with3 = 0;
  let with0 = 0;
  let totalImages = 0;
  let mdmCount = 0;
  let localCount = 0;
  let brokenImages = 0;

  const brandCounts: Record<string, number> = {};
  TARGET_16_BRANDS.forEach(b => brandCounts[b] = 0);

  const checklist: Array<{
    num: string;
    sku: string;
    brand: string;
    name: string;
    imgCount: number;
    status: string;
  }> = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const num = `Product ${String(i + 1).padStart(3, "0")}`;
    const pBrandUpper = (p.brand || "").toUpperCase();

    // Match brand
    for (const b of TARGET_16_BRANDS) {
      if (pBrandUpper === b || pBrandUpper.startsWith(b)) {
        brandCounts[b]++;
        break;
      }
    }

    const imgCount = p.images.length;
    totalImages += imgCount;

    if (imgCount === 0) with0++;
    else if (imgCount === 1) with1++;
    else if (imgCount === 2) with2++;
    else if (imgCount >= 3) with3++;

    // Check images
    for (const img of p.images) {
      if (img.startsWith("http")) {
        mdmCount++;
      } else {
        localCount++;
        // Verify local file exists in public/
        const localPath = path.join(process.cwd(), "public", img);
        if (!fs.existsSync(localPath)) {
          console.warn(`Broken local image: ${img} on product ${p.sku}`);
          brokenImages++;
        }
      }
    }

    checklist.push({
      num,
      sku: p.sku,
      brand: p.brand || "UNBRANDED",
      name: p.name,
      imgCount,
      status: imgCount > 0 ? "PASS" : "FIX (Missing image)"
    });
  }

  console.log("\n=== CHECKLIST (FIRST 80 PRODUCTS) ===");
  for (let i = 0; i < Math.min(80, checklist.length); i++) {
    const item = checklist[i];
    console.log(`${item.num}: [${item.sku}] ${item.brand} - ${item.name} (${item.imgCount} images) → ${item.status}`);
  }

  console.log("\n=== 16 TARGET BRANDS DISTRIBUTION ===");
  for (const b of TARGET_16_BRANDS) {
    console.log(`${b}: ${brandCounts[b]}`);
  }

  console.log("\n=== IMAGE STATS ===");
  console.log({
    totalProducts: products.length,
    productsWith0Images: with0,
    productsWith1Image: with1,
    productsWith2Images: with2,
    productsWith3PlusImages: with3,
    totalImagesInCatalogue: totalImages,
    mdmCloudinaryImages: mdmCount,
    localStudioImages: localCount,
    brokenImagesFound: brokenImages
  });

  await prisma.$disconnect();
}

main().catch(console.error);
