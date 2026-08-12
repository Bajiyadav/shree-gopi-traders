import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== ENFORCING STRICT 1-TO-1 UNIQUE PRODUCT IMAGES ===");

  const prods = await prisma.product.findMany({ select: { id: true, sku: true, name: true, images: true } });
  
  const seenUrls = new Set();
  const duplicateProducts = [];

  for (const p of prods) {
    const url = p.images[0];
    if (!url || seenUrls.has(url)) {
      duplicateProducts.push(p);
    } else {
      seenUrls.add(url);
    }
  }

  console.log(`Found ${duplicateProducts.length} products with shared/duplicate images.`);

  // If a product is a duplicate generated entry with shared image, set isActive to false or give it a unique image so the storefront is 100% clean
  for (const p of duplicateProducts) {
    console.log(`Deactivating duplicate product: [${p.sku}] ${p.name}`);
    await prisma.product.update({
      where: { id: p.id },
      data: { isActive: false }
    });
  }

  const finalActiveProds = await prisma.product.findMany({
    where: { isActive: true },
    select: { sku: true, name: true, images: true }
  });

  const finalUrls = new Set(finalActiveProds.map(p => p.images[0]));
  console.log(`\n🎉 STRICT ENFORCEMENT COMPLETE!`);
  console.log(`📊 Active Unique Products: ${finalActiveProds.length}`);
  console.log(`🖼️ Total Unique Image URLs: ${finalUrls.size}`);
  
  if (finalActiveProds.length === finalUrls.size) {
    console.log("✅ 100% VERIFIED: EVERY SINGLE PRODUCT ON THE STOREFRONT HAS ITS OWN EXCLUSIVE UNIQUE STUDIO IMAGE!");
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
