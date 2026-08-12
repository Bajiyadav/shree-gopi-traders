import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/waxing";

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

async function main() {
  console.log("=== ADDING RICHELON CHARCOAL LIPOSOLUBLE CARTRIDGE WAX ===");

  const mediaPath = "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485790903.png";
  const buf = readFileSync(mediaPath);
  console.log("Reading image:", mediaPath, `(${buf.length} bytes)`);

  const cloudinaryUrl = await uploadToCloudinary(buf, "richelon-charcoal-wax.png", "richelon-charcoal-liposoluble-cartridge-wax-100g");
  console.log("Uploaded Cloudinary URL:", cloudinaryUrl);

  // Check or create Waxing category
  let category = await prisma.category.findUnique({
    where: { slug: "waxing" },
  });

  if (!category) {
    console.log("Creating 'Waxing' category...");
    category = await prisma.category.create({
      data: {
        name: "Waxing",
        slug: "waxing",
        description: "Liposoluble pro wax, cartridge waxes, strip waxes and waxing supplies for professional salon hair removal treatments.",
        imageUrl: cloudinaryUrl,
        isActive: true,
        sortOrder: 6,
      },
    });
  } else {
    category = await prisma.category.update({
      where: { id: category.id },
      data: {
        isActive: true,
        imageUrl: category.imageUrl || cloudinaryUrl,
      },
    });
  }

  const sku = "RCH-WAX-CHARCOAL-100G";
  const slug = "richelon-charcoal-liposoluble-cartridge-wax-100g";

  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: sku },
        { slug: slug },
        { name: { contains: "Richelon Charcoal", mode: "insensitive" } },
      ],
    },
    include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
  });

  if (product) {
    console.log(`Updating existing product '${product.name}' (ID: ${product.id})...`);
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        basePrice: "300",
        images: [cloudinaryUrl],
        updatedAt: new Date(),
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });

    for (const v of product.variants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { price: "300", imageUrl: cloudinaryUrl },
      });
    }
  } else {
    console.log("Creating new product Richelon Charcoal Liposoluble Cartridge Wax...");
    product = await prisma.product.create({
      data: {
        name: "Richelon Charcoal Liposoluble Cartridge Wax (100g)",
        slug: slug,
        sku: sku,
        brand: "Richelon",
        description: "Cleanse and purify your skin with Richelon Charcoal Liposoluble Cartridge Wax. This soft wax requires strips and removes hair effectively while detoxifying the skin. Salon-grade formula trusted by 3000+ salon professionals.",
        specs: JSON.stringify({
          "Weight": "100g",
          "Formulation": "Soft Liposoluble Cartridge Wax",
          "Key Ingredients": "Cocoa Seed Butter, Bees Wax, Glyceryl Rosinate, Vegetable Oil, Charcoal",
          "Application": "Requires Wax Strips",
          "Skin Type": "All Skin Types / Detoxifying"
        }),
        basePrice: "300",
        weight: "0.1",
        images: [cloudinaryUrl],
        isActive: true,
        moq: 1,
        categoryId: category.id,
        variants: {
          create: [
            {
              name: "100g Cartridge",
              sku: sku,
              price: "300",
              weight: "0.1",
              imageUrl: cloudinaryUrl,
              isActive: true,
              inventory: {
                create: {
                  stock: 50,
                  lowStockThreshold: 10,
                },
              },
              wholesaleTiers: {
                create: [
                  { minQty: 1, maxQty: 4, pricePerUnit: "300" },
                  { minQty: 5, maxQty: 9, pricePerUnit: "270" },
                  { minQty: 10, maxQty: null, pricePerUnit: "240" },
                ],
              },
            },
          ],
        },
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });
  }

  console.log("Successfully created/updated product:", JSON.stringify(product, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
