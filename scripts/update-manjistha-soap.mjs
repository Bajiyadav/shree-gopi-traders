import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/skin-care";

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
  console.log("=== UPDATING MDM HERBAL MANJISTHA SOAP ===");

  const imageFiles = [
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485114886.png",
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485120190.png",
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485125832.png",
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485145721.png",
  ];

  const cloudinaryUrls = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const filePath = imageFiles[i];
    const buf = readFileSync(filePath);
    const publicId = `mdm-herbal-manjistha-soap-${i + 1}`;
    console.log(`Uploading image ${i + 1}/${imageFiles.length}: ${filePath}`);
    const url = await uploadToCloudinary(buf, `manjistha-${i + 1}.png`, publicId);
    cloudinaryUrls.push(url);
    console.log(`✓ Cloudinary URL ${i + 1}: ${url}`);
  }

  // Find MDM Herbal Manjistha Soap product
  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: "MDM-MANJISTHA-100G-X6" },
        { name: { contains: "Manjistha", mode: "insensitive" } },
      ],
    },
    include: { variants: { include: { wholesaleTiers: true } } },
  });

  if (!product) {
    throw new Error("MDM Herbal Manjistha Soap product not found in database!");
  }

  console.log(`Updating product '${product.name}' (ID: ${product.id})...`);

  // Update basePrice to 290 and images to all 4 uploaded Cloudinary URLs
  product = await prisma.product.update({
    where: { id: product.id },
    data: {
      basePrice: "290",
      images: cloudinaryUrls,
      updatedAt: new Date(),
    },
    include: { variants: { include: { wholesaleTiers: true } } },
  });

  // Update variants and wholesale tiers
  for (const variant of product.variants) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: {
        price: "290",
        imageUrl: cloudinaryUrls[0],
        updatedAt: new Date(),
      },
    });

    // Delete existing wholesale tiers and create updated ones for 290 price
    await prisma.wholesalePriceTier.deleteMany({
      where: { productVariantId: variant.id },
    });

    await prisma.wholesalePriceTier.createMany({
      data: [
        { productVariantId: variant.id, minQty: 1, maxQty: 4, pricePerUnit: "290" },
        { productVariantId: variant.id, minQty: 5, maxQty: 9, pricePerUnit: "265" },
        { productVariantId: variant.id, minQty: 10, maxQty: null, pricePerUnit: "240" },
      ],
    });
  }

  const updatedProduct = await prisma.product.findUnique({
    where: { id: product.id },
    include: { variants: { include: { wholesaleTiers: true } } },
  });

  console.log("Successfully updated product!");
  console.log(JSON.stringify(updatedProduct, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
