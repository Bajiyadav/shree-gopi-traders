import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mdmSkus = [
    'MDM-NEEM-ALOE-100G-X8',
    'MDM-MANJISTHA-100G-X6',
    'MDM-VANA-SHAMPOO-300',
    'MDM-VANA-SHAMPOO-300ML'
  ];

  const products = await prisma.product.findMany({
    where: {
      sku: { in: mdmSkus }
    },
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

  console.log('=== MDM PRODUCTS IN DB ===');
  for (const p of products) {
    console.log(JSON.stringify(p, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
