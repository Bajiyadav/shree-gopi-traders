import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/barber-supplies";

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
  console.log("=== ADDING PHILIPS ALL-IN-ONE TRIMMER 3000 SERIES (9 IN 1) ===");

  const mediaPath = "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786486545240.png";
  const buf = readFileSync(mediaPath);
  console.log("Reading image:", mediaPath, `(${buf.length} bytes)`);

  const cloudinaryUrl = await uploadToCloudinary(buf, "philips-trimmer-3000.png", "philips-all-in-one-trimmer-3000-series-9in1");
  console.log("Uploaded Cloudinary URL:", cloudinaryUrl);

  const category = await prisma.category.findUnique({
    where: { slug: "barber-supplies" },
  });

  if (!category) {
    throw new Error("Barber Supplies category not found in database!");
  }

  const sku = "SGT-PHILIPS-TR3000-9IN1";
  const variantSku = "SGT-PHILIPS-TR3000-9IN1-VAR";
  const slug = "philips-all-in-one-trimmer-3000-series-9-in-1";

  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: sku },
        { slug: slug },
        { name: { contains: "Philips All-in-One Trimmer", mode: "insensitive" } },
      ],
    },
    include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
  });

  if (product) {
    console.log(`Updating existing product '${product.name}' (ID: ${product.id})...`);
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        basePrice: "1895",
        images: [cloudinaryUrl],
        updatedAt: new Date(),
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });

    for (const v of product.variants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { price: "1895", imageUrl: cloudinaryUrl },
      });
    }
  } else {
    console.log("Creating new product Philips All-in-One Trimmer 3000 Series (9 in 1)...");
    product = await prisma.product.create({
      data: {
        name: "Philips All-in-One Trimmer 3000 Series (9-in-1 Grooming Kit)",
        slug: slug,
        sku: sku,
        brand: "Philips",
        description: "Complete multi-grooming kit with Philips All-in-One Trimmer 3000 Series. 9-in-1 versatile attachments for face, hair, body, intimate grooming, and nose/ear trimming. Features self-sharpening stainless steel blades, up to 60 minutes cordless runtime, and 5-year warranty with registration.",
        specs: JSON.stringify({
          "Series": "3000 Series",
          "Attachments": "9-in-1 (Trimmer, Nose/Ear, Adjustable Beard Comb, Hair Combs, Body Combs, Eyebrow Guard)",
          "Blade Material": "Self-sharpening Stainless Steel",
          "Runtime": "Up to 60 minutes cordless",
          "Warranty": "Up to 5 Years Warranty",
          "Waterproof": "Rinsable Attachments"
        }),
        basePrice: "1895",
        weight: "0.35",
        images: [cloudinaryUrl],
        isActive: true,
        moq: 1,
        categoryId: category.id,
        variants: {
          create: [
            {
              name: "9-in-1 Grooming Kit",
              sku: variantSku,
              price: "1895",
              weight: "0.35",
              imageUrl: cloudinaryUrl,
              isActive: true,
              inventory: {
                create: {
                  stock: 30,
                  lowStockThreshold: 5,
                },
              },
              wholesaleTiers: {
                create: [
                  { minQty: 1, maxQty: 4, pricePerUnit: "1895" },
                  { minQty: 5, maxQty: 9, pricePerUnit: "1720" },
                  { minQty: 10, maxQty: null, pricePerUnit: "1550" },
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
