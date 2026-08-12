import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== REMOVING EMPTY CATEGORIES (0 PRODUCTS) ===");

  const emptyCategories = await prisma.category.findMany({
    where: {
      products: {
        none: {
          isActive: true,
        },
      },
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  console.log(`Found ${emptyCategories.length} categories with 0 active products.`);

  for (const cat of emptyCategories) {
    console.log(`Deleting empty category: ${cat.name} (${cat.slug})`);
    
    // Disconnect or delete any legacy inactive products linked to this category first
    await prisma.product.deleteMany({
      where: { categoryId: cat.id },
    });

    await prisma.category.delete({
      where: { id: cat.id },
    });
  }

  const remainingCategories = await prisma.category.findMany({
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  console.log(`\nRemaining Active Categories (${remainingCategories.length}):`);
  for (const c of remainingCategories) {
    console.log(`- ${c.name} (${c.slug}): ${c._count.products} products`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
