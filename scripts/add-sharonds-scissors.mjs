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
  console.log("=== ADDING SHARONDS 6 INCH 440C SCISSORS SET ===");

  const imageFiles = [
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786486134420.png",
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786486142716.png",
  ];

  const cloudinaryUrls = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const filePath = imageFiles[i];
    const buf = readFileSync(filePath);
    const publicId = `sharonds-6-inch-440c-scissors-set-${i + 1}`;
    console.log(`Uploading image ${i + 1}/${imageFiles.length}: ${filePath}`);
    const url = await uploadToCloudinary(buf, `sharonds-${i + 1}.png`, publicId);
    cloudinaryUrls.push(url);
    console.log(`✓ Cloudinary URL ${i + 1}: ${url}`);
  }

  const category = await prisma.category.findUnique({
    where: { slug: "barber-supplies" },
  });

  if (!category) {
    throw new Error("Barber Supplies category not found in database!");
  }

  const sku = "SGT-SHARONDS-6IN-SET";
  const slug = "sharonds-6-inch-440c-hair-scissors-set";

  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: sku },
        { slug: slug },
        { name: { contains: "SHARONDS", mode: "insensitive" } },
      ],
    },
    include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
  });

  if (product) {
    console.log(`Updating existing product '${product.name}' (ID: ${product.id})...`);
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        basePrice: "13830",
        images: cloudinaryUrls,
        updatedAt: new Date(),
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });

    for (const v of product.variants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { price: "13830", imageUrl: cloudinaryUrls[0] },
      });
    }
  } else {
    console.log("Creating new product SHARONDS 6 Inch 440C Hair Scissors Set...");
    product = await prisma.product.create({
      data: {
        name: "SHARONDS 6 Inch 440C High Hardness Stainless Steel Hair Scissors Set",
        slug: slug,
        sku: sku,
        brand: "SHARONDS",
        description: "Professional SHARONDS 6.0 inch salon barber hairdressing scissors set forged from 440C high carbon stainless steel (62 HRC). Features hand-sharpened raised edges, mirror polish finish, ergonomic handle design, and shock absorber for smooth silent cutting. Includes 1x cutting scissors, 1x thinning scissors (20%-30%), and protective storage pouch.",
        specs: JSON.stringify({
          "Blade Material": "440C High Carbon Stainless Steel (62HRC)",
          "Size": "6.0 Inches (17.5 cm)",
          "Thinning Rate": "20% - 30%",
          "Included Components": "1x Cutting Scissors, 1x Thinning Scissors, Storage Bag",
          "Weight": "0.21 kg"
        }),
        basePrice: "13830",
        weight: "0.21",
        images: cloudinaryUrls,
        isActive: true,
        moq: 1,
        categoryId: category.id,
        variants: {
          create: [
            {
              name: "6.0 Inch Scissors Set",
              sku: sku,
              price: "13830",
              weight: "0.21",
              imageUrl: cloudinaryUrls[0],
              isActive: true,
              inventory: {
                create: {
                  stock: 15,
                  lowStockThreshold: 3,
                },
              },
              wholesaleTiers: {
                create: [
                  { minQty: 1, maxQty: 4, pricePerUnit: "13830" },
                  { minQty: 5, maxQty: 9, pricePerUnit: "12500" },
                  { minQty: 10, maxQty: null, pricePerUnit: "11200" },
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
