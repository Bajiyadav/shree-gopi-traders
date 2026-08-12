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
  console.log("=== ADDING / UPDATING MY SAFFRON BEAUTY SOAP ===");
  const mediaPath = "/Users/bajiyadav/.gemini/antigravity-ide/brain/567f1f0a-381d-4a69-93f1-fdd79c144325/media__1786485031288.png";
  
  const buf = readFileSync(mediaPath);
  console.log("Reading image:", mediaPath, `(${buf.length} bytes)`);

  const cloudinaryUrl = await uploadToCloudinary(buf, "mdm-my-saffron-soap.png", "mdm-herbal-my-saffron-beauty-soap-150g");
  console.log("Uploaded Cloudinary URL:", cloudinaryUrl);

  const skinCareCategory = await prisma.category.findUnique({
    where: { slug: "skin-care" },
  });

  if (!skinCareCategory) {
    throw new Error("Skin Care category not found in database");
  }

  const sku = "MDM-SAFFRON-SOAP-150G";
  const slug = "mdm-herbal-mulikaa-my-saffron-beauty-soap-150g";

  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: sku },
        { slug: slug },
        { name: { contains: "Saffron", mode: "insensitive" } },
      ],
    },
    include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
  });

  if (product) {
    console.log(`Updating existing product '${product.name}' (ID: ${product.id})...`);
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        images: [cloudinaryUrl],
        updatedAt: new Date(),
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });

    for (const v of product.variants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { imageUrl: cloudinaryUrl },
      });
    }
  } else {
    console.log("Creating new product for MDM Herbal Mulikaa My Saffron Beauty Soap...");
    product = await prisma.product.create({
      data: {
        name: "MDM Herbal Mulikaa My Saffron Beauty Soap – 150g",
        slug: slug,
        sku: sku,
        brand: "MDM Herbal",
        description: "Enriched with Saffron (Kesar) & Suvarna Pindi (Ayurvedic Herbal Complex). Helps support radiant complexion, gentle cleansing, and skin nourishment. 100% natural, Ayurvedic formulation suitable for face and body across all skin types.",
        specs: JSON.stringify({
          "Weight": "150g",
          "Key Ingredients": "Saffron (Kesar), Suvarna Pindi, Sandalwood, Jasmine, Wild Turmeric",
          "Formulation": "100% Natural Ayurvedic Beauty Soap",
          "Skin Type": "All Skin Types"
        }),
        basePrice: "180",
        weight: "0.15",
        images: [cloudinaryUrl],
        isActive: true,
        moq: 1,
        categoryId: skinCareCategory.id,
        variants: {
          create: [
            {
              name: "150g Bar",
              sku: sku,
              price: "180",
              weight: "0.15",
              imageUrl: cloudinaryUrl,
              isActive: true,
              inventory: {
                create: {
                  stock: 100,
                  lowStockThreshold: 10,
                },
              },
              wholesaleTiers: {
                create: [
                  { minQty: 1, maxQty: 4, pricePerUnit: "180" },
                  { minQty: 5, maxQty: 9, pricePerUnit: "165" },
                  { minQty: 10, maxQty: null, pricePerUnit: "150" },
                ],
              },
            },
          ],
        },
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });
  }

  console.log("Successfully saved product:", JSON.stringify(product, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
