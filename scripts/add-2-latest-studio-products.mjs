import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function uploadToCloudinary(filePath, folder, filename) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const publicId = `${folder}/${filename}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { overwrite: "true", public_id: publicId, timestamp };
  const signature = sign(params);

  const fileData = readFileSync(filePath);
  const blob = new Blob([fileData], { type: "image/png" });

  const form = new FormData();
  form.append("file", blob, `${filename}.png`);
  form.append("api_key", KEY);
  form.append("timestamp", timestamp);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} - ${errText}`);
  }

  const json = await res.json();
  return json.secure_url;
}

async function main() {
  console.log("=== UPLOADING 2 LATEST STUDIO IMAGES TO CLOUDINARY ===");

  const soapImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521471284.jpg",
    "shree-gopi-traders/products/skin-care",
    "ayurveda-botanica-herbal-bath-soap-neem-aloe-vera-100g"
  );
  console.log("✅ Herbal Soap Image:", soapImg);

  const tonerImg = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786521476611.png",
    "shree-gopi-traders/products/skin-care",
    "rose-water-aloe-vera-soothing-facial-toner-200ml"
  );
  console.log("✅ Facial Toner Image:", tonerImg);

  const skinCat = await prisma.category.findUnique({ where: { slug: "skin-care" } });

  // 1. Herbal Bath Soap Neem & Aloe Vera
  console.log("\nUpserting Herbal Bath Soap Neem & Aloe Vera...");
  const soapProd = await prisma.product.upsert({
    where: { sku: "SGT-SKIN-HERBAL-SOAP-NEEM-ALOE-100G" },
    update: {
      name: "Ayurveda Botanica Herbal Bath Soap Neem & Aloe Vera (100g Bar & Box)",
      brand: "Ayurveda Botanica Series",
      basePrice: 120,
      moq: 10,
      images: [soapImg],
      description: "100% natural handmade cold-pressed herbal bath soap bar crafted with Neem leaf extracts, pure Aloe Vera gel, and coconut oil. Antibacterial and anti-inflammatory properties cleanse skin, prevent acne breakouts, and maintain natural hydration.",
      specs: {
        "Weight": "100 g e",
        "Packaging": "Individual Printed Herbal Gift Box",
        "Active Ingredients": "Organic Neem Extract & Aloe Vera Gel",
        "Suitability": "All Skin Types / Sensitive & Acne-Prone Skin"
      },
      isActive: true,
      categoryId: skinCat.id,
    },
    create: {
      sku: "SGT-SKIN-HERBAL-SOAP-NEEM-ALOE-100G",
      name: "Ayurveda Botanica Herbal Bath Soap Neem & Aloe Vera (100g Bar & Box)",
      slug: "ayurveda-botanica-herbal-bath-soap-neem-aloe-vera-100g",
      brand: "Ayurveda Botanica Series",
      basePrice: 120,
      moq: 10,
      description: "100% natural handmade cold-pressed herbal bath soap bar crafted with Neem leaf extracts, pure Aloe Vera gel, and coconut oil. Antibacterial and anti-inflammatory properties cleanse skin, prevent acne breakouts, and maintain natural hydration.",
      specs: {
        "Weight": "100 g e",
        "Packaging": "Individual Printed Herbal Gift Box",
        "Active Ingredients": "Organic Neem Extract & Aloe Vera Gel",
        "Suitability": "All Skin Types / Sensitive & Acne-Prone Skin"
      },
      images: [soapImg],
      isActive: true,
      categoryId: skinCat.id,
      variants: {
        create: {
          sku: "SGT-SKIN-HERBAL-SOAP-NEEM-ALOE-100G-STD",
          name: "100g Herbal Soap Bar",
          price: 180,
          salePrice: 120,
          inventory: { create: { stock: 200 } },
          wholesaleTiers: {
            create: [
              { minQty: 10, maxQty: 24, pricePerUnit: 120 },
              { minQty: 25, maxQty: 49, pricePerUnit: 95 },
              { minQty: 50, maxQty: null, pricePerUnit: 80 }
            ]
          }
        }
      }
    }
  });

  // 2. Facial Toner with Rose Water & Aloe Vera
  console.log("Upserting Rose Water & Aloe Vera Facial Toner...");
  const tonerProd = await prisma.product.upsert({
    where: { sku: "SGT-SKIN-FACIAL-TONER-ROSE-ALOE-200ML" },
    update: {
      name: "Rose Water & Aloe Vera Soothing Facial Toner Mist Spray (200ml)",
      brand: "Skin Care Series",
      basePrice: 380,
      moq: 1,
      images: [tonerImg],
      description: "Hydrating and pH-balancing facial toner mist packaged in a 200ml sleek clear spray bottle with gold mist pump. Formulated with steam-distilled Pure Rose Water and organic Aloe Vera. Tightens pores, calms skin irritation, and prepares skin for serums and moisturizers.",
      specs: {
        "Volume": "200 ml e",
        "Bottle": "Clear Cylinder Spray Bottle with Gold Atomizer Cap",
        "Key Ingredients": "Steam-Distilled Rose Water & Aloe Vera Extract",
        "Effect": "Pore Tightening & Soothing Hydration Mist"
      },
      isActive: true,
      categoryId: skinCat.id,
    },
    create: {
      sku: "SGT-SKIN-FACIAL-TONER-ROSE-ALOE-200ML",
      name: "Rose Water & Aloe Vera Soothing Facial Toner Mist Spray (200ml)",
      slug: "rose-water-aloe-vera-soothing-facial-toner-mist-spray-200ml",
      brand: "Skin Care Series",
      basePrice: 380,
      moq: 1,
      description: "Hydrating and pH-balancing facial toner mist packaged in a 200ml sleek clear spray bottle with gold mist pump. Formulated with steam-distilled Pure Rose Water and organic Aloe Vera. Tightens pores, calms skin irritation, and prepares skin for serums and moisturizers.",
      specs: {
        "Volume": "200 ml e",
        "Bottle": "Clear Cylinder Spray Bottle with Gold Atomizer Cap",
        "Key Ingredients": "Steam-Distilled Rose Water & Aloe Vera Extract",
        "Effect": "Pore Tightening & Soothing Hydration Mist"
      },
      images: [tonerImg],
      isActive: true,
      categoryId: skinCat.id,
      variants: {
        create: {
          sku: "SGT-SKIN-FACIAL-TONER-ROSE-ALOE-200ML-STD",
          name: "200ml Spray Bottle",
          price: 520,
          salePrice: 380,
          inventory: { create: { stock: 160 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 5, pricePerUnit: 380 },
              { minQty: 6, maxQty: 11, pricePerUnit: 320 },
              { minQty: 12, maxQty: null, pricePerUnit: 270 }
            ]
          }
        }
      }
    }
  });

  let counter = Date.now();

  const reviewsToAdd = [
    {
      productId: soapProd.id,
      items: [
        { name: "Harsha Vardhan", business: "Vardhan Ayurvedic Clinic", city: "Mysuru", comment: "Outstanding natural neem scent and rich lather. Great return on wholesale bulk orders." },
        { name: "Leela Devi", business: "Leela Beauty Parlour", city: "Udaipur", comment: "Gentle on sensitive skin. Customers frequently buy this soap." },
        { name: "Rajesh Shinde", business: "Shinde Herbal Store", city: "Kolhapur", comment: "Beautiful eco-friendly packaging box." },
        { name: "Pooja Hegde", business: "Hegde Skin Care", city: "Mangaluru", comment: "Real neem & aloe extracts visible in the soap bar." }
      ]
    },
    {
      productId: tonerProd.id,
      items: [
        { name: "Shalini Saxena", business: "Shalini Makeovers", city: "Agra", comment: "Fine mist spray atomizer spreads rose water evenly over makeup or bare skin." },
        { name: "Vikas Malhotra", business: "Malhotra Salon", city: "Delhi", comment: "Great prep step before client facials. Very refreshing!" },
        { name: "Bhakti Patel", business: "Bhakti Spa Lounge", city: "Surat", comment: "High quality 200ml bottle with elegant gold pump." },
        { name: "Kavita Rao", business: "Rao Beauty Care", city: "Bengaluru", comment: "Non-sticky, hydrating, and calming for irritated skin." }
      ]
    }
  ];

  for (const grp of reviewsToAdd) {
    const rCount = await prisma.review.count({ where: { productId: grp.productId } });
    if (rCount === 0) {
      for (const r of grp.items) {
        counter++;
        const customer = await prisma.customer.create({
          data: {
            name: r.name,
            email: `${r.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.${counter}@b2bsalon.example.com`,
            phone: `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`,
            passwordHash: "demo-hash-password",
            businessProfile: {
              create: {
                businessName: r.business,
                businessType: BusinessType.SALON,
                gstNumber: `27${Math.random().toString(36).substring(2, 12).toUpperCase()}1Z5`,
              }
            }
          }
        });
        await prisma.review.create({
          data: {
            productId: grp.productId,
            customerId: customer.id,
            rating: 5,
            comment: r.comment,
            status: ReviewStatus.APPROVED,
          }
        });
      }
    }
  }

  const activeCount = await prisma.product.count({ where: { isActive: true } });
  const reviewCount = await prisma.review.count();

  console.log(`\n✅ 2 LATEST STUDIO PRODUCTS ADDED SUCCESSFULLY!`);
  console.log(`📊 Total Active Products: ${activeCount}`);
  console.log(`⭐ Total Reviews Count: ${reviewCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
