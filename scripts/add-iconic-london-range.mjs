import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/makeup";

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
    name: "ICONIC London Underglow Blurring Primer",
    slug: "iconic-london-underglow-blurring-primer",
    sku: "SGT-MK-ICONIC-PRIMER",
    brand: "ICONIC London",
    basePrice: 3500,
    description:
      "Prep, smooth, and blur skin with ICONIC London Underglow Blurring Primer. A weightless liquid primer serum that hydrates skin, blurs pores, and imparts an inner candlelit radiance under foundation or worn alone on bare skin.",
    specs: {
      "Product Type": "Blurring Primer Serum",
      "Finish": "Soft-focus candlelit radiant glow",
      "Key Actives": "Vitamin C, Hydrating Elixir, Soft-Focus Spheres",
      "Net Volume": "30ml",
      "Formulation": "Paraben-Free, Cruelty-Free, Vegan Formula",
      "Professional Use": "Professional MUA & Salon Skincare Prep",
    },
    variants: [
      { name: "Original (30ml)", sku: "SGT-MK-ICONIC-PRIMER-ORIG", price: 3500 },
      { name: "Glow (30ml)", sku: "SGT-MK-ICONIC-PRIMER-GLOW", price: 3500 },
    ],
  },
  {
    name: "ICONIC London Prep-Set-Glow Shimmer Spray",
    slug: "iconic-london-prep-set-glow-shimmer-spray",
    sku: "SGT-MK-ICONIC-PREPSET",
    brand: "ICONIC London",
    basePrice: 3500,
    description:
      "Prep, hydrate, and set your skin with best-selling ICONIC London Prep-Set-Glow shimmer spray. Infused with Green Tea, Chamomile, and Vitamin E to soothe skin while delivering a multi-dimensional, luminous glow that lasts all day.",
    specs: {
      "Product Type": "Hydrating Shimmer Setting Spray",
      "Key Ingredients": "Green Tea Extract, Chamomile, Vitamin E, Light-reflecting Pearls",
      "Finish": "High-shine luminous glow",
      "Net Volume": "120ml",
      "Professional Use": "MUA & Salon Finishing Spray",
    },
    variants: [
      { name: "Original (120ml)", sku: "SGT-MK-ICONIC-PREPSET-ORIG", price: 3500 },
      { name: "Glow (120ml)", sku: "SGT-MK-ICONIC-PREPSET-GLOW", price: 3500 },
    ],
  },
  {
    name: "ICONIC London Radiance Booster Liquid Enhancer",
    slug: "iconic-london-radiance-booster-liquid-enhancer",
    sku: "SGT-MK-ICONIC-RADBOOST",
    brand: "ICONIC London",
    basePrice: 3850,
    description:
      "An all-over liquid radiance booster and skin enhancer for a dewy, glass-skin filter glow. Formulated with Oleo-Gel Complex and Luminizer Complex for radiant, perfected skin under foundation or as a high-shine highlighter.",
    specs: {
      "Product Type": "Liquid Radiance Enhancer",
      "Finish": "Dewy Glass-Skin Filter Finish",
      "Technology": "Oleo-Gel & Luminizer Complex",
      "Net Volume": "30ml",
      "Professional Use": "Professional MUA Dewy Skin Enhancer",
    },
    variants: [
      { name: "Pearl Glow (30ml)", sku: "SGT-MK-ICONIC-RADBOOST-PEARL", price: 3850 },
      { name: "Champagne Glow (30ml)", sku: "SGT-MK-ICONIC-RADBOOST-CHAMP", price: 3850 },
    ],
  },
  {
    name: "ICONIC London Precision Foundation & Contour Stick",
    slug: "iconic-london-precision-foundation-contour-stick",
    sku: "SGT-MK-ICONIC-STICK",
    brand: "ICONIC London",
    basePrice: 3950,
    description:
      "Creamy dual-ended foundation & contour stick featuring an integrated dense blending brush for seamless, buildable coverage on the go. Blends effortlessly into skin for a smooth, sculpted, photo-ready finish.",
    specs: {
      "Product Type": "Foundation & Contour Stick with Built-in Brush",
      "Built-in Tool": "Integrated Synthetic Dense Blending Brush",
      "Coverage": "Medium to Full Buildable Coverage",
      "Net Weight": "12g",
      "Professional Use": "Professional MUA Sculpting & Base",
    },
    variants: [
      { name: "Warm Nude (12g)", sku: "SGT-MK-ICONIC-STICK-NUDE", price: 3950 },
      { name: "Golden Tan (12g)", sku: "SGT-MK-ICONIC-STICK-TAN", price: 3950 },
      { name: "Deep Bronze (12g)", sku: "SGT-MK-ICONIC-STICK-BRONZE", price: 3950 },
    ],
  },
];

async function main() {
  console.log("=== ADDING ICONIC LONDON MAKEUP RANGE ===");

  let category = await prisma.category.findUnique({
    where: { slug: "makeup" },
  });

  if (!category) {
    console.log("Creating 'Makeup' category...");
    category = await prisma.category.create({
      data: {
        name: "Makeup",
        slug: "makeup",
        description: "Professional makeup, primers, foundation sticks, highlighters and beauty products for salon artists.",
        isActive: true,
      },
    });
  }

  const localDir = path.join(process.cwd(), "public/products/makeup");

  for (const item of PRODUCTS) {
    console.log(`\nProcessing ${item.name}...`);

    const cUrls = [];
    for (let i = 1; i <= 3; i++) {
      const fileName = i === 1 ? `${item.slug}.png` : `${item.slug}-${i}.png`;
      const localPath = path.join(localDir, fileName);
      const publicId = i === 1 ? item.slug : `${item.slug}-${i}`;

      if (existsSync(localPath)) {
        const buf = readFileSync(localPath);
        console.log(`Uploading ${fileName} to Cloudinary...`);
        const url = await uploadToCloudinary(buf, fileName, publicId);
        cUrls.push(url);
      }
    }

    let product = await prisma.product.findFirst({
      where: { OR: [{ slug: item.slug }, { sku: item.sku }, { name: item.name }] },
    });

    if (product) {
      console.log(`Updating existing product ID: ${product.id}`);
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
      console.log("Creating product record...");
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

    for (const v of item.variants) {
      console.log(`  Upserting variant: ${v.name} (SKU: ${v.sku})`);
      let variant = await prisma.productVariant.findFirst({ where: { sku: v.sku } });
      if (variant) {
        variant = await prisma.productVariant.update({
          where: { id: variant.id },
          data: { name: v.name, price: String(v.price), productId: product.id, isActive: true },
        });
      } else {
        variant = await prisma.productVariant.create({
          data: { sku: v.sku, name: v.name, price: String(v.price), productId: product.id, isActive: true },
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

  console.log("\n✅ ALL 4 ICONIC LONDON PRODUCTS ADDED SUCCESSFULLY!");
}

main()
  .catch((err) => {
    console.error("Error adding ICONIC London range:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
