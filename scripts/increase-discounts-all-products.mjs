import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INCREASING WHOLESALE DISCOUNTS FOR ALL CATALOGUE PRODUCTS ===");

  const variants = await prisma.productVariant.findMany({
    include: { product: true }
  });

  let updatedCount = 0;

  // Higher attractive wholesale discount tiers: 25%, 30%, 35%, 40%, 45%, 50% OFF
  const discountTiers = [25, 30, 35, 40, 45, 50];

  for (const v of variants) {
    // Current actual wholesale selling price
    const actualSalePrice = Number(v.salePrice && Number(v.salePrice) > 0 ? v.salePrice : v.price);
    
    // Pick slightly higher discount tier
    const discount = discountTiers[updatedCount % discountTiers.length];

    // Calculate higher original list price (MRP)
    const listPrice = Math.round(actualSalePrice / (1 - discount / 100));

    await prisma.productVariant.update({
      where: { id: v.id },
      data: {
        price: listPrice,
        salePrice: actualSalePrice
      }
    });

    console.log(`🔥 Updated [${v.sku}] ${v.product.name} -> List Price: ₹${listPrice}, Sale Price: ₹${actualSalePrice} (${discount}% OFF)`);
    updatedCount++;
  }

  console.log(`\n🎉 SUCCESS: INCREASED DISCOUNTS FOR ALL ${updatedCount} PRODUCT VARIANTS!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
