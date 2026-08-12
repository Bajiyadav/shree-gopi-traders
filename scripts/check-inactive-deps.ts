import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const inactiveProducts = await prisma.product.findMany({
    where: { isActive: false },
    select: {
      id: true,
      sku: true,
      name: true,
      _count: {
        select: {
          orderItems: true,
          reviews: true,
          variants: true
        }
      }
    }
  });

  console.log(`Found ${inactiveProducts.length} inactive products.`);
  
  let withOrders = 0;
  for (const p of inactiveProducts) {
    if (p._count.orderItems > 0) {
      withOrders++;
      console.log(`Inactive product with orders: [${p.sku}] ${p.name} -> ${p._count.orderItems} order items`);
    }
  }

  console.log(`Inactive products with order dependencies: ${withOrders}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
