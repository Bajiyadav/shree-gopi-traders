import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const MDM_PRODUCTS_CONFIG = [
  {
    sku: 'MDM-NEEM-ALOE-100G-X8',
    name: 'MDM Herbal Neem With Aloevera Soap 800G (100G X 8) Super Saver Pack',
    basePrice: 320,
    brand: 'MDM',
    categorySlug: 'skin-care',
    image: 'https://res.cloudinary.com/dg8z7pxju/image/upload/v1786480717/Waf3xwqX_VQXJJ9XVX6_2026-07-30_1_kuaukz.webp',
    mainVariantSku: 'MDM-NEEM-ALOE-100G-X8',
    mainVariantName: '100G X 8 Pack',
    stock: 150,
    weight: 0.8,
    tiers: [
      { minQty: 1, maxQty: 4, pricePerUnit: 320 },
      { minQty: 5, maxQty: 9, pricePerUnit: 295 },
      { minQty: 10, maxQty: null, pricePerUnit: 270 },
    ]
  },
  {
    sku: 'MDM-MANJISTHA-100G-X6',
    name: 'MDM Herbal Manjistha Soap – 100g x 6 Super Saver Pack',
    basePrice: 360,
    brand: 'MDM',
    categorySlug: 'skin-care',
    image: 'https://res.cloudinary.com/dg8z7pxju/image/upload/v1786479969/_drbt_IO_9UII944SIT_2026-07-25_1_wpcwee.webp',
    mainVariantSku: 'MDM-MANJISTHA-100G-X6',
    mainVariantName: '100g x 6 Pack',
    stock: 8,
    weight: 0.6,
    tiers: [
      { minQty: 1, maxQty: 4, pricePerUnit: 360 },
      { minQty: 5, maxQty: 9, pricePerUnit: 330 },
      { minQty: 10, maxQty: null, pricePerUnit: 300 },
    ]
  },
  {
    sku: 'MDM-VANA-SHAMPOO-300',
    name: 'Mulika Hair Oil',
    basePrice: 320,
    brand: 'MDM Herbal',
    categorySlug: 'hair-care',
    image: 'https://res.cloudinary.com/dg8z7pxju/image/upload/v1786479296/1Pv9rmzk_NIQAV922LZ_2026-07-23_4_hxauzz.webp',
    mainVariantSku: 'MDM-VANA-SHAMPOO-300',
    mainVariantName: 'Mulika Hair Oil',
    stock: 10,
    weight: 0.5,
    tiers: [
      { minQty: 1, maxQty: 4, pricePerUnit: 320 },
      { minQty: 5, maxQty: 9, pricePerUnit: 295 },
      { minQty: 10, maxQty: null, pricePerUnit: 270 },
    ]
  },
  {
    sku: 'MDM-VANA-SHAMPOO-300ML',
    name: 'MDM Herbal VANA Shampoo',
    basePrice: 293,
    brand: 'MDM Herbal',
    categorySlug: 'hair-care',
    image: 'https://res.cloudinary.com/dg8z7pxju/image/upload/v1786478180/PBIFCem6MrnW_9L7Q6ERAN6_2026-08-01_1_a60vi7.webp',
    mainVariantSku: 'MDM-VANA-SHAMPOO-300ML',
    mainVariantName: '300ml',
    stock: 5,
    weight: 0.3,
    tiers: [
      { minQty: 1, maxQty: 4, pricePerUnit: 293 },
      { minQty: 5, maxQty: 9, pricePerUnit: 270 },
      { minQty: 10, maxQty: null, pricePerUnit: 249 },
    ]
  }
];

async function main() {
  console.log('Starting MDM pricing update...');
  for (const cfg of MDM_PRODUCTS_CONFIG) {
    console.log(`Processing SKU: ${cfg.sku}`);
    const product = await prisma.product.findUnique({
      where: { sku: cfg.sku },
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

    if (!product) {
      console.log(`Product ${cfg.sku} not found.`);
      continue;
    }

    const category = await prisma.category.findUnique({
      where: { slug: cfg.categorySlug }
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        name: cfg.name,
        brand: cfg.brand,
        basePrice: new Prisma.Decimal(cfg.basePrice),
        salePrice: null,
        images: [cfg.image],
        weight: new Prisma.Decimal(cfg.weight),
        isActive: true,
        categoryId: category ? category.id : product.categoryId,
      }
    });
    console.log(`Product ${cfg.sku} main record updated.`);

    let mainVar = product.variants.find(v => v.sku === cfg.mainVariantSku);
    if (!mainVar && product.variants.length > 0) {
      mainVar = product.variants[0];
    }

    if (mainVar) {
      await prisma.productVariant.update({
        where: { id: mainVar.id },
        data: {
          name: cfg.mainVariantName,
          sku: cfg.mainVariantSku,
          price: new Prisma.Decimal(cfg.basePrice),
          salePrice: null,
          imageUrl: cfg.image,
          weight: new Prisma.Decimal(cfg.weight),
          isActive: true
        }
      });
      console.log(`Variant ${mainVar.sku} updated.`);

      await prisma.inventory.upsert({
        where: { productVariantId: mainVar.id },
        create: { stock: cfg.stock, lowStockThreshold: 5, productVariantId: mainVar.id },
        update: { stock: cfg.stock }
      });
      console.log(`Inventory for ${mainVar.sku} set to ${cfg.stock}.`);

      await prisma.wholesalePriceTier.deleteMany({
        where: { productVariantId: mainVar.id }
      });

      for (const t of cfg.tiers) {
        await prisma.wholesalePriceTier.create({
          data: {
            productVariantId: mainVar.id,
            minQty: t.minQty,
            maxQty: t.maxQty,
            pricePerUnit: new Prisma.Decimal(t.pricePerUnit)
          }
        });
      }
      console.log(`Tiers updated for ${mainVar.sku}.`);

      // Clean up extra 0-stock variants safely
      const extraVariants = product.variants.filter(v => v.id !== mainVar!.id);
      for (const ev of extraVariants) {
        if (!ev.inventory || ev.inventory.stock === 0) {
          try {
            await prisma.cartItem.deleteMany({ where: { productVariantId: ev.id } });
            await prisma.orderItem.deleteMany({ where: { productVariantId: ev.id } });
            await prisma.wholesalePriceTier.deleteMany({ where: { productVariantId: ev.id } });
            await prisma.inventory.deleteMany({ where: { productVariantId: ev.id } });
            await prisma.productVariant.delete({ where: { id: ev.id } });
            console.log(`Removed unused variant [${ev.sku}]`);
          } catch (e) {
            console.warn(`Could not remove variant ${ev.sku}, deactivating instead:`, (e as Error).message);
            await prisma.productVariant.update({
              where: { id: ev.id },
              data: { isActive: false }
            });
          }
        }
      }
    }
  }

  console.log('MDM update completed successfully!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
