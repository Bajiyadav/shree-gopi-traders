import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: { where: { isActive: true } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  console.log("=== ALL CATEGORIES IN DATABASE ===");
  for (const c of categories) {
    console.log(`ID: ${c.id} | Slug: ${c.slug} | Name: ${c.name} | Active: ${c.isActive} | Active Products: ${c._count.products}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
