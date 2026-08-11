import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE_SERUM_IMAGE = "/Users/bajiyadav/.gemini/antigravity-ide/brain/acc72129-5cb0-4d90-9efd-c635e9fe082f/media__1786469714733.png";
const DEST_DIR = path.join(process.cwd(), "public/products/skin-care");

async function generateStudioPhotos(slug: string, sourceImgPath: string) {
  if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

  const p1 = path.join(DEST_DIR, `${slug}.png`);
  const p2 = path.join(DEST_DIR, `${slug}-2.png`);
  const p3 = path.join(DEST_DIR, `${slug}-3.png`);

  const bgSvg = `<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
    <radialGradient id="studio" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>
    <rect width="1000" height="1000" fill="url(#studio)"/>
    <ellipse cx="500" cy="850" rx="220" ry="35" fill="#0f172a" opacity="0.14" filter="blur(16px)"/>
  </svg>`;

  const bgBuf = Buffer.from(bgSvg);

  const productResized = await sharp(sourceImgPath)
    .resize({ height: 720, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const p1Buf = await sharp(bgBuf)
    .composite([{ input: productResized, top: 120, left: 340 }])
    .png()
    .toBuffer();

  const p2Buf = await sharp(bgBuf)
    .composite([{ input: productResized, top: 100, left: 340 }])
    .png()
    .toBuffer();

  const p3Buf = await sharp(bgBuf)
    .composite([{ input: productResized, top: 130, left: 340 }])
    .png()
    .toBuffer();

  fs.writeFileSync(p1, p1Buf);
  fs.writeFileSync(p2, p2Buf);
  fs.writeFileSync(p3, p3Buf);
}

const productsToInsert = [
  {
    name: "L’Oréal Paris Glycolic Bright Dark Spot Brightening Serum",
    slug: "loreal-glycolic-bright-dark-spot-brightening-serum",
    sku: "SGT-SC-010",
    brand: "L’Oréal Paris",
    basePrice: 349,
    description:
      "Formulated with Glycolic Acid, L’Oréal Paris Glycolic Bright Dark Spot Brightening Serum is clinically proven to reduce dark spots, even out skin tone, and boost radiance. Designed for professional salon aesthetic treatments and daily skincare rituals. Leaves skin noticeably brighter, smoother, and luminous with consistent application.",
    specs: {
      "Product Type": "Brightening face serum",
      "Key Active": "Glycolic Acid",
      Concern: "Dark spots / Hyperpigmentation / Dullness",
      "Skin Type": "All skin types",
      Formulation: "Lightweight serum",
      Usage: "Morning & Night after cleansing",
    },
    variants: [
      { name: "15ml", sku: "SGT-SC-010-15ML", price: 349 },
      { name: "30ml", sku: "SGT-SC-010-30ML", price: 749 },
      { name: "50ml", sku: "SGT-SC-010-50ML", price: 1099 },
    ],
  },
  {
    name: "L’Oréal Paris Glycolic Bright Daily Foaming Face Cleanser",
    slug: "loreal-glycolic-bright-daily-foaming-face-cleanser",
    sku: "SGT-SC-011",
    brand: "L’Oréal Paris",
    basePrice: 199,
    description:
      "L’Oréal Paris Glycolic Bright Daily Foaming Face Cleanser gently exfoliates skin and removes dullness for an instantly clean, glowing appearance. Enriched with Glycolic Acid, it micro-exfoliates impurities while maintaining natural moisture balance. Ideal for salon prep and daily facial cleansing.",
    specs: {
      "Product Type": "Foaming Face Cleanser",
      "Key Active": "Glycolic Acid",
      Concern: "Impurities / Dullness / Uneven Skin Tone",
      "Skin Type": "All skin types",
      Texture: "Rich foam lather",
    },
    variants: [
      { name: "50ml", sku: "SGT-SC-011-50ML", price: 199 },
      { name: "100ml", sku: "SGT-SC-011-100ML", price: 349 },
      { name: "150ml", sku: "SGT-SC-011-150ML", price: 499 },
    ],
  },
  {
    name: "L’Oréal Paris Glycolic Bright Glowing Night Cream",
    slug: "loreal-glycolic-bright-glowing-night-cream",
    sku: "SGT-SC-012",
    brand: "L’Oréal Paris",
    basePrice: 325,
    description:
      "L’Oréal Paris Glycolic Bright Glowing Night Cream works overnight to visibly reduce dark spots and replenish skin moisture. Infused with Glycolic Acid and Vitamin E, this rich night cream nourishes the skin barrier while accelerating overnight cellular renewal for radiant skin every morning.",
    specs: {
      "Product Type": "Night Face Cream",
      "Key Active": "Glycolic Acid & Vitamin E",
      Concern: "Overnight Repair / Hyperpigmentation",
      "Skin Type": "All skin types",
      Texture: "Rich nourishing cream",
    },
    variants: [
      { name: "15g", sku: "SGT-SC-012-15G", price: 325 },
      { name: "50g", sku: "SGT-SC-012-50G", price: 699 },
    ],
  },
  {
    name: "L’Oréal Paris Glycolic Bright Day Cream With SPF 17",
    slug: "loreal-glycolic-bright-day-cream-spf-17",
    sku: "SGT-SC-013",
    brand: "L’Oréal Paris",
    basePrice: 325,
    description:
      "L’Oréal Paris Glycolic Bright Day Cream With SPF 17 shields skin from harmful UV rays while actively targeting dark spots. Featuring Glycolic Acid and broad-spectrum sun filters, it prevents sun-induced pigmentation and restores healthy luminosity for all-day skin confidence.",
    specs: {
      "Product Type": "Day Face Cream with Sun Protection",
      "Key Active": "Glycolic Acid & SPF 17",
      Concern: "UV Protection / Dark Spots",
      "Skin Type": "All skin types",
      Texture: "Light non-greasy cream",
    },
    variants: [
      { name: "15g", sku: "SGT-SC-013-15G", price: 325 },
      { name: "50g", sku: "SGT-SC-013-50G", price: 699 },
    ],
  },
];

async function main() {
  const category = await prisma.category.findUnique({ where: { slug: "skin-care" } });
  if (!category) throw new Error("Skin Care category not found in DB");

  for (const item of productsToInsert) {
    console.log(`Processing product: ${item.name}`);

    // Generate images
    await generateStudioPhotos(item.slug, SOURCE_SERUM_IMAGE);

    const productData = {
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      brand: item.brand,
      description: item.description,
      specs: item.specs,
      images: [
        `/products/skin-care/${item.slug}.png`,
        `/products/skin-care/${item.slug}-2.png`,
        `/products/skin-care/${item.slug}-3.png`,
      ],
      basePrice: item.basePrice,
      categoryId: category.id,
      isActive: true,
    };

    let product = await prisma.product.findUnique({ where: { slug: item.slug } });
    if (!product) {
      product = await prisma.product.create({ data: productData });
      console.log(`  ✓ Created Product: ${product.name}`);
    } else {
      product = await prisma.product.update({ where: { id: product.id }, data: productData });
      console.log(`  ✓ Updated Product: ${product.name}`);
    }

    for (const v of item.variants) {
      let variant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            isActive: true,
          },
        });
      } else {
        variant = await prisma.productVariant.update({
          where: { id: variant.id },
          data: { price: v.price, isActive: true },
        });
      }

      // Upsert Inventory
      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        create: { productVariantId: variant.id, stock: 100, lowStockThreshold: 10 },
        update: { stock: 100 },
      });

      // Wholesale tiers
      await prisma.wholesalePriceTier.deleteMany({ where: { productVariantId: variant.id } });
      const base = Number(v.price);

      await prisma.wholesalePriceTier.createMany({
        data: [
          { productVariantId: variant.id, minQty: 1, maxQty: 4, pricePerUnit: Math.round(base * 0.9) },
          { productVariantId: variant.id, minQty: 5, maxQty: 9, pricePerUnit: Math.round(base * 0.82) },
          { productVariantId: variant.id, minQty: 10, maxQty: 24, pricePerUnit: Math.round(base * 0.75) },
          { productVariantId: variant.id, minQty: 25, maxQty: null, pricePerUnit: Math.round(base * 0.68) },
        ],
      });

      console.log(`    - Variant ${v.name} (${v.sku}) configured.`);
    }
  }

  console.log("\n✅ All 4 L'Oréal Paris Glycolic Bright products successfully added!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
