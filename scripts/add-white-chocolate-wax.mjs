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
  console.log("=== ADDING RICHELON WHITE CHOCOLATE LIPOSOLUBLE CARTRIDGE WAX ===");

  const mediaPath = "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485930481.png";
  const buf = readFileSync(mediaPath);
  console.log("Reading image:", mediaPath, `(${buf.length} bytes)`);

  const cloudinaryUrl = await uploadToCloudinary(buf, "richelon-white-chocolate-wax.png", "richelon-white-chocolate-liposoluble-cartridge-wax-100g");
  console.log("Uploaded Cloudinary URL:", cloudinaryUrl);

  const category = await prisma.category.findUnique({
    where: { slug: "waxing" },
  });

  if (!category) {
    throw new Error("Waxing category not found in database!");
  }

  const sku = "RCH-WAX-WHITE-CHOC-100G";
  const slug = "richelon-white-chocolate-liposoluble-cartridge-wax-100g";

  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: sku },
        { slug: slug },
        { name: { contains: "White Chocolate Liposoluble Cartridge", mode: "insensitive" } },
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
    console.log("Creating new product Richelon White Chocolate Liposoluble Cartridge Wax...");
    product = await prisma.product.create({
      data: {
        name: "Richelon White Chocolate Liposoluble Cartridge Wax (100g)",
        slug: slug,
        sku: sku,
        brand: "Richelon",
        description: "Enjoy nourishing hair removal with Richelon White Chocolate Liposoluble Cartridge Wax. This soft wax requires strips and leaves skin soft, smooth, and hydrated. Salon-grade formula trusted by 3000+ salon professionals.",
        specs: JSON.stringify({
          "Weight": "100g",
          "Formulation": "Soft Liposoluble Cartridge Wax",
          "Key Ingredients": "Cocoa Seed Butter, Bees Wax, Glyceryl Rosinate, Vegetable Oil",
          "Application": "Requires Wax Strips",
          "Skin Type": "All Skin Types / Nourishing & Hydrating"
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

  console.log("Successfully created product:", JSON.stringify(product, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
