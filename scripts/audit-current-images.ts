import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";

const prisma = new PrismaClient();

async function inspectImages() {
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      images: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy: { name: "asc" },
  });

  const inactiveProducts = await prisma.product.findMany({
    where: { isActive: false },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      images: true,
    },
  });

  console.log(`Found ${activeProducts.length} active products and ${inactiveProducts.length} inactive products.`);

  const urlPatterns: Record<string, number> = {};
  const imageCounts: Record<number, number> = {};
  const allActiveImages: string[] = [];

  for (const p of activeProducts) {
    const count = p.images.length;
    imageCounts[count] = (imageCounts[count] || 0) + 1;

    for (const img of p.images) {
      allActiveImages.push(img);
      const urlType = img.startsWith("http")
        ? new URL(img).hostname
        : img.startsWith("/")
        ? img.split("/")[1]
        : "other";
      urlPatterns[urlType] = (urlPatterns[urlType] || 0) + 1;
    }
  }

  console.log("\nActive Products Image Count Distribution:", imageCounts);
  console.log("Active Products URL Pattern Distribution:", urlPatterns);

  fs.writeFileSync(
    "scripts/current-active-products-audit.json",
    JSON.stringify(activeProducts, null, 2)
  );

  console.log("Saved active products audit to scripts/current-active-products-audit.json");
  await prisma.$disconnect();
}

inspectImages().catch(console.error);
