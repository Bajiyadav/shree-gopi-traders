import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== ADDING ATTRACTIVE DISCOUNTS TO CATALOGUE PRODUCTS ===");

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: true }
  });

  let updatedCount = 0;

  for (const v of variants) {
    const currentSalePrice = Number(v.salePrice || v.price);
    
    // Give 15% to 35% discount by setting list price higher than sale price
    // Pick discount percentage based on SKU hash or index
    const discountPercents = [15, 20, 25, 30, 35];
    const discount = discountPercents[updatedCount % discountPercents.length];

    // Calculate list price so that (listPrice - salePrice) / listPrice = discount%
    const listPrice = Math.round(currentSalePrice / (1 - discount / 100));

    await prisma.productVariant.update({
      where: { id: v.id },
      data: {
        price: listPrice,
        salePrice: currentSalePrice
      }
    });

    console.log(`✅ Updated Variant [${v.sku}] -> List Price: ₹${listPrice}, Sale Price: ₹${currentSalePrice} (${discount}% OFF)`);
    updatedCount++;
  }

  console.log(`\n🎉 SUCCESS: ADDED DISCOUNTS TO ${updatedCount} PRODUCT VARIANTS!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
