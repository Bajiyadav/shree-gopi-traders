import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/hair-color-treatment";

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function uploadToCloudinary(buf, filename, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder: FOLDER, public_id: publicId, overwrite: "true", timestamp };

  const form = new FormData();
  form.append("file", new Blob([buf]), filename);
  form.append("api_key", KEY);
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
  form.append("signature", sign(signed));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return body.secure_url;
}

const PRODUCTS = [
  {
    name: "Schwarzkopf Professional IGORA ROYAL Permanent Color Cream",
    slug: "igora-royal-permanent-color-cream",
    sku: "SGT-HT-IGORA-ROYAL",
    brand: "Schwarzkopf Professional",
    basePrice: 540,
    headline: "THE COLORIST'S CHOICE FOR PERMANENT COLOR",
    description:
      "Our heritage color brand IGORA ROYAL® is the reference brand for true color performance. IGORA ROYAL® brings optimal color coverage, maximum color retention, and true-to-tuft / true-to-swatch results for professional salon hair coloring. Engineered with High-Definition Color Matrix technology for uncompromised coverage on grey and brilliant color intensity.",
    specs: {
      "Product Type": "Permanent Hair Color Creme",
      "Coverage": "Up to 100% white hair coverage",
      "Technology": "High-Definition Color Matrix Technology",
      "Mixing Ratio": "1:1 with IGORA ROYAL Oil Developer",
      "Processing Time": "30–45 minutes",
      "Net Volume": "60ml",
      "Professional Use": "Professional salon hair coloring only",
    },
    variants: [
      { name: "3-0 Dark Brown (60ml)", sku: "SGT-HT-IGORA-ROYAL-30", price: 540 },
      { name: "5-0 Light Brown (60ml)", sku: "SGT-HT-IGORA-ROYAL-50", price: 540 },
      { name: "6-0 Dark Blonde (60ml)", sku: "SGT-HT-IGORA-ROYAL-60", price: 540 },
      { name: "7-0 Medium Blonde (60ml)", sku: "SGT-HT-IGORA-ROYAL-70", price: 540 },
      { name: "6-88 Dark Blonde Red Extra (60ml)", sku: "SGT-HT-IGORA-ROYAL-688", price: 570 },
      { name: "9.5-1 Pearl Toner (60ml)", sku: "SGT-HT-IGORA-ROYAL-951", price: 570 },
    ],
  },
  {
    name: "Schwarzkopf Professional IGORA ROYAL Absolutes Anti-Age Color Cream",
    slug: "igora-royal-absolutes-permanent-color-cream",
    sku: "SGT-HT-IGORA-ABSOLUTES",
    brand: "Schwarzkopf Professional",
    basePrice: 575,
    headline: "PERMANENT ANTI-AGE COLOR CREME FOR MATURE HAIR",
    description:
      "IGORA ROYAL® Absolutes is specially formulated for mature hair, providing 100% white hair coverage with intense fashion tones. Enriched with Siliamine and Collagen Complex to rebuild and strengthen thinning hair fibers while delivering rich, natural, true-to-swatch anti-age color results with optimal scalp comfort.",
    specs: {
      "Product Type": "Anti-Age Permanent Color Creme",
      "Coverage": "100% white hair coverage on mature hair",
      "Key Active": "Siliamine & Collagen Complex",
      "Mixing Ratio": "1:1 with IGORA ROYAL Oil Developer",
      "Processing Time": "30–45 minutes",
      "Net Volume": "60ml",
      "Professional Use": "Professional salon anti-aging color services",
    },
    variants: [
      { name: "5-50 Light Brown Gold (60ml)", sku: "SGT-HT-IGORA-ABS-550", price: 575 },
      { name: "6-60 Dark Blonde Chocolate (60ml)", sku: "SGT-HT-IGORA-ABS-660", price: 575 },
      { name: "7-50 Medium Blonde Gold (60ml)", sku: "SGT-HT-IGORA-ABS-750", price: 575 },
      { name: "8-50 Light Blonde Gold (60ml)", sku: "SGT-HT-IGORA-ABS-850", price: 575 },
    ],
  },
  {
    name: "Schwarzkopf Professional IGORA VIBRANCE Tone on Tone Coloration",
    slug: "igora-vibrance-tone-on-tone-coloration",
    sku: "SGT-HT-IGORA-VIBRANCE",
    brand: "Schwarzkopf Professional",
    basePrice: 525,
    headline: "MOISTURIZING ALCOHOL-FREE DEMI-PERMANENT HAIR COLOR",
    description:
      "IGORA® VIBRANCE is a state-of-the-art moisturizing demi-permanent hair coloration with a liquid formula that transforms into gel or cream. 100% alcohol-free and enriched with Moisture Protecting Complex featuring AQUAXYL™ Technology to deliver vibrant tone-on-tone color results and up to 100% more shine.",
    specs: {
      "Product Type": "Demi-Permanent Tone on Tone Coloration",
      "Formulation": "100% Alcohol-Free Liquid-to-Gel/Cream",
      "Active Complex": "Moisture Protecting Complex with AQUAXYL™",
      "Shine Boost": "Up to 100% extra shine",
      "Mixing Ratio": "1:1 with IGORA VIBRANCE Activator",
      "Processing Time": "5–20 minutes",
      "Net Volume": "60ml",
      "Professional Use": "Professional salon glossing, toning & color refreshing",
    },
    variants: [
      { name: "0-00 Clear Gloss (60ml)", sku: "SGT-HT-IGORA-VIB-000", price: 525 },
      { name: "6-0 Dark Blonde (60ml)", sku: "SGT-HT-IGORA-VIB-60", price: 525 },
      { name: "7-5 Medium Blonde Gold (60ml)", sku: "SGT-HT-IGORA-VIB-75", price: 525 },
      { name: "9.5-1 Pastel Cendré Toner (60ml)", sku: "SGT-HT-IGORA-VIB-951", price: 550 },
    ],
  },
  {
    name: "Schwarzkopf Professional IGORA ZERO AMM Ammonia-Free Color Cream",
    slug: "igora-zero-amm-hair-color-creme",
    sku: "SGT-HT-IGORA-ZERO-AMM",
    brand: "Schwarzkopf Professional",
    basePrice: 590,
    headline: "ZERO AMMONIA FOR AN OPTIMAL COLOR RESULT",
    description:
      "IGORA® ZERO AMM is an ammonia-free permanent hair color creme engineered for natural, true-to-tone color performance. Formulated with Phytolipid Technology for optimal scalp comfort, neutral fragrance, and up to 100% white hair coverage without ammonia.",
    specs: {
      "Product Type": "Ammonia-Free Permanent Hair Color Creme",
      "Ammonia Content": "100% Ammonia-Free",
      "Key Technology": "Phytolipid Technology & Natural Care Oils",
      "Coverage": "Up to 100% white hair coverage",
      "Fragrance": "Odorless / Scalp comfort formulation",
      "Mixing Ratio": "1:1 with IGORA ROYAL Oil Developer",
      "Net Volume": "60ml",
      "Professional Use": "Professional salon ammonia-free color services",
    },
    variants: [
      { name: "3-0 Natural Dark Brown (60ml)", sku: "SGT-HT-IGORA-ZAMM-30", price: 590 },
      { name: "5-0 Natural Light Brown (60ml)", sku: "SGT-HT-IGORA-ZAMM-50", price: 590 },
      { name: "6-0 Natural Dark Blonde (60ml)", sku: "SGT-HT-IGORA-ZAMM-60", price: 590 },
      { name: "7-0 Natural Medium Blonde (60ml)", sku: "SGT-HT-IGORA-ZAMM-70", price: 590 },
    ],
  },
];

async function main() {
  console.log("=== PARALLEL ADDING SCHWARZKOPF PROFESSIONAL IGORA COLOR RANGE ===");

  // 1. Get or create Hair Color & Treatment category
  let category = await prisma.category.findUnique({
    where: { slug: "hair-color-treatment" },
  });

  if (!category) {
    console.log("Creating 'Hair Color & Treatment' category...");
    category = await prisma.category.create({
      data: {
        name: "Hair Color & Treatment",
        slug: "hair-color-treatment",
        description:
          "Professional colour, bleach, developers and chemical treatments for salon colour and smoothening services.",
        isActive: true,
      },
    });
  }

  const localDir = path.join(process.cwd(), "public/products/hair-color-treatment");

  for (const item of PRODUCTS) {
    console.log(`\nUploading images for ${item.name}...`);

    // Upload 3 studio images to Cloudinary in parallel
    const uploadTasks = [1, 2, 3].map(async (i) => {
      const fileName = i === 1 ? `${item.slug}.png` : `${item.slug}-${i}.png`;
      const localPath = path.join(localDir, fileName);
      const publicId = i === 1 ? item.slug : `${item.slug}-${i}`;

      if (existsSync(localPath)) {
        const buf = readFileSync(localPath);
        return uploadToCloudinary(buf, fileName, publicId);
      }
      return null;
    });

    const cUrls = (await Promise.all(uploadTasks)).filter(Boolean);
    console.log(`Uploaded ${cUrls.length} Cloudinary images.`);

    // Upsert product in DB
    let product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: item.slug }, { sku: item.sku }, { name: item.name }],
      },
    });

    if (product) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          name: item.name,
          brand: item.brand,
          sku: item.sku,
          description: item.description,
          specs: item.specs,
          images: cUrls,
          basePrice: String(item.basePrice),
          isActive: true,
          categoryId: category.id,
          updatedAt: new Date(),
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          brand: item.brand,
          description: item.description,
          specs: item.specs,
          images: cUrls,
          basePrice: String(item.basePrice),
          isActive: true,
          categoryId: category.id,
        },
      });
    }

    console.log(`Product upserted: ${product.name} (ID: ${product.id})`);

    // Upsert variants and tiers
    for (const v of item.variants) {
      let variant = await prisma.productVariant.findFirst({
        where: { sku: v.sku },
      });

      if (variant) {
        variant = await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            name: v.name,
            price: String(v.price),
            productId: product.id,
            isActive: true,
          },
        });
      } else {
        variant = await prisma.productVariant.create({
          data: {
            sku: v.sku,
            name: v.name,
            price: String(v.price),
            productId: product.id,
            isActive: true,
          },
        });
      }

      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        update: { stock: 50, lowStockThreshold: 5 },
        create: { productVariantId: variant.id, stock: 50, lowStockThreshold: 5 },
      });

      const tier1Price = String(v.price);
      const tier5Price = String(Math.round(v.price * 0.95));
      const tier10Price = String(Math.round(v.price * 0.90));

      await prisma.wholesalePriceTier.deleteMany({ where: { productVariantId: variant.id } });
      await prisma.wholesalePriceTier.createMany({
        data: [
          { productVariantId: variant.id, minQty: 1, maxQty: 4, pricePerUnit: tier1Price },
          { productVariantId: variant.id, minQty: 5, maxQty: 9, pricePerUnit: tier5Price },
          { productVariantId: variant.id, minQty: 10, maxQty: null, pricePerUnit: tier10Price },
        ],
      });
    }
  }

  console.log("\n✅ ALL 4 SCHWARZKOPF IGORA PRODUCTS ADDED TO DB SUCCESSFULLY!");
}

main()
  .catch((err) => {
    console.error("Error adding IGORA range:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
