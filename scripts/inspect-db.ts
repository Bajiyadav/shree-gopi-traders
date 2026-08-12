import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: {
        include: {
          inventory: true,
          wholesaleTiers: true
        }
      }
    }
  });

  const activeProducts = products.filter(p => p.isActive);
  const inactiveProducts = products.filter(p => !p.isActive);

  console.log('=== ACTIVE PRODUCTS (Count: ' + activeProducts.length + ') ===');
  for (const p of activeProducts) {
    console.log(`[ACTIVE] ID:${p.id} | SKU:${p.sku} | Name:${p.name} | Brand:${p.brand} | Cat:${p.category.name} | BasePrice:${p.basePrice} | SalePrice:${p.salePrice}`);
    console.log(`  Images (${p.images.length}):`, p.images);
    for (const v of p.variants) {
      console.log(`    - Variant [${v.isActive ? 'ACTIVE' : 'INACTIVE'}] SKU:${v.sku} | Name:${v.name} | Price:${v.price} | SalePrice:${v.salePrice} | Stock:${v.inventory?.stock}`);
    }
  }

  console.log('\n=== INACTIVE PRODUCTS (Count: ' + inactiveProducts.length + ') ===');
  for (const p of inactiveProducts) {
    console.log(`[INACTIVE] ID:${p.id} | SKU:${p.sku} | Name:${p.name} | Brand:${p.brand} | Cat:${p.category.name} | BasePrice:${p.basePrice} | SalePrice:${p.salePrice}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
