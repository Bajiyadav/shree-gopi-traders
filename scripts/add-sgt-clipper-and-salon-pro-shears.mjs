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
  console.log("=== UPLOADING NEW SGT CLIPPER & SALON PRO SHEARS IMAGES TO CLOUDINARY ===");

  const folder = "shree-gopi-traders/products/barber-supplies";

  const img1Url = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786511998959.jpg",
    folder,
    "sgt-pro-cordless-hair-clipper-primary-hero"
  );
  console.log("✅ Primary Hero Clipper Image:", img1Url);

  const img2Url = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786511866388.jpg",
    folder,
    "sgt-pro-cordless-hair-clipper-desk-hero"
  );
  console.log("✅ Desk Hero Clipper Image:", img2Url);

  const img3Url = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786511847556.png",
    folder,
    "sgt-pro-cordless-hair-clipper-angles-sheet"
  );
  console.log("✅ Clipper Sheet Image:", img3Url);

  const img4Url = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786511852629.png",
    folder,
    "salon-pro-sgt-barber-scissors-angles-sheet"
  );
  console.log("✅ Scissors Sheet Image:", img4Url);

  const barberCategory = await prisma.category.findUnique({ where: { slug: "barber-supplies" } });
  if (!barberCategory) throw new Error("barber-supplies category not found");

  // 1. SGT® Professional Heavy-Duty Cordless Hair Clipper & Fade Trimmer
  console.log("\nUpserting SGT® Professional Cordless Hair Clipper...");
  const clipperProduct = await prisma.product.upsert({
    where: { sku: "SGT-BAR-CLIPPER-PRO-SGT9" },
    update: {
      name: "SGT® Professional Heavy-Duty Cordless Hair Clipper & Fade Trimmer",
      brand: "SGT® Professional",
      basePrice: 2290,
      moq: 1,
      images: [img1Url, img2Url, img3Url],
      description: "Commercial-grade cordless hair clipper featuring gunmetal matte finish, gold taper lever switch, precision carbon-steel blades, 5V 1A USB-C fast charging, high-torque rotary motor, 4 guard comb attachments (1.5mm, 3mm, 4.5mm, 6mm), blade oil and maintenance brush. Engineered for all-day heavy duty salon and barbershop use.",
      specs: {
        "Motor Speed": "7200 RPM High-Torque Motor",
        "Blade Material": "Self-Sharpening Carbon Steel",
        "Charging Interface": "5V 1A USB-C Fast Charge",
        "Battery Runtime": "Up to 240 Minutes",
        "Taper Lever": "Micro-Adjustable Gold Lever",
        "Includes": "4 Guard Combs (1.5, 3, 4.5, 6mm), Oil Bottle, Brush, USB Cable"
      },
      isActive: true,
      categoryId: barberCategory.id,
    },
    create: {
      sku: "SGT-BAR-CLIPPER-PRO-SGT9",
      name: "SGT® Professional Heavy-Duty Cordless Hair Clipper & Fade Trimmer",
      slug: "sgt-professional-heavy-duty-cordless-hair-clipper",
      brand: "SGT® Professional",
      basePrice: 2290,
      moq: 1,
      description: "Commercial-grade cordless hair clipper featuring gunmetal matte finish, gold taper lever switch, precision carbon-steel blades, 5V 1A USB-C fast charging, high-torque rotary motor, 4 guard comb attachments (1.5mm, 3mm, 4.5mm, 6mm), blade oil and maintenance brush. Engineered for all-day heavy duty salon and barbershop use.",
      specs: {
        "Motor Speed": "7200 RPM High-Torque Motor",
        "Blade Material": "Self-Sharpening Carbon Steel",
        "Charging Interface": "5V 1A USB-C Fast Charge",
        "Battery Runtime": "Up to 240 Minutes",
        "Taper Lever": "Micro-Adjustable Gold Lever",
        "Includes": "4 Guard Combs (1.5, 3, 4.5, 6mm), Oil Bottle, Brush, USB Cable"
      },
      images: [img1Url, img2Url, img3Url],
      isActive: true,
      categoryId: barberCategory.id,
      variants: {
        create: {
          sku: "SGT-BAR-CLIPPER-PRO-SGT9-SINGLE",
          name: "Standard Clipper Kit (Gunmetal Gold)",
          price: 2850,
          salePrice: 2290,
          inventory: { create: { stock: 65 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 4, pricePerUnit: 2290 },
              { minQty: 5, maxQty: 9, pricePerUnit: 2050 },
              { minQty: 10, maxQty: null, pricePerUnit: 1850 },
            ]
          }
        }
      }
    }
  });

  // 2. Salon Pro SGT 6-Inch Japanese Stainless Steel Ergonomic Barber Scissors Kit
  console.log("Upserting Salon Pro SGT 6-Inch Barber Scissors Kit...");
  const shearsProduct = await prisma.product.upsert({
    where: { sku: "SGT-BAR-SHEARS-SALON-PRO-6IN" },
    update: {
      name: "Salon Pro SGT 6-Inch Japanese Stainless Steel Barber Scissors & Shears Kit",
      brand: "Salon Pro / SGT®",
      basePrice: 1550,
      moq: 1,
      images: [img4Url],
      description: "Professional 6-inch hair cutting & thinning shears set crafted from 440C Japanese high-carbon stainless steel. Features razor-sharp convex blades, adjustable tension screw key, removable rubber finger rests, offset ergonomic handles, padded leather storage pouch, micro-fiber cleaning cloth, and precision barber comb.",
      specs: {
        "Steel Type": "440C Japanese High-Carbon Stainless Steel",
        "Blade Edge": "Convex Razor-Sharp Edge",
        "Size": "6.0 Inch",
        "Handle Design": "Offset Ergonomic Handle with Rubber Bumper",
        "Tension System": "Adjustable Tension Control Screw",
        "Includes": "Leather Zipper Case, Cleaning Cloth, Barber Comb, Tension Key"
      },
      isActive: true,
      categoryId: barberCategory.id,
    },
    create: {
      sku: "SGT-BAR-SHEARS-SALON-PRO-6IN",
      name: "Salon Pro SGT 6-Inch Japanese Stainless Steel Barber Scissors & Shears Kit",
      slug: "salon-pro-sgt-6-inch-barber-scissors-kit",
      brand: "Salon Pro / SGT®",
      basePrice: 1550,
      moq: 1,
      description: "Professional 6-inch hair cutting & thinning shears set crafted from 440C Japanese high-carbon stainless steel. Features razor-sharp convex blades, adjustable tension screw key, removable rubber finger rests, offset ergonomic handles, padded leather storage pouch, micro-fiber cleaning cloth, and precision barber comb.",
      specs: {
        "Steel Type": "440C Japanese High-Carbon Stainless Steel",
        "Blade Edge": "Convex Razor-Sharp Edge",
        "Size": "6.0 Inch",
        "Handle Design": "Offset Ergonomic Handle with Rubber Bumper",
        "Tension System": "Adjustable Tension Control Screw",
        "Includes": "Leather Zipper Case, Cleaning Cloth, Barber Comb, Tension Key"
      },
      images: [img4Url],
      isActive: true,
      categoryId: barberCategory.id,
      variants: {
        create: {
          sku: "SGT-BAR-SHEARS-SALON-PRO-6IN-KIT",
          name: "Complete Barber Scissors Kit (6.0 Inch)",
          price: 1950,
          salePrice: 1550,
          inventory: { create: { stock: 80 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 4, pricePerUnit: 1550 },
              { minQty: 5, maxQty: 9, pricePerUnit: 1380 },
              { minQty: 10, maxQty: null, pricePerUnit: 1220 },
            ]
          }
        }
      }
    }
  });

  // Add 4 approved B2B reviews for each product if none exist yet
  const reviewsCountClipper = await prisma.review.count({ where: { productId: clipperProduct.id } });
  if (reviewsCountClipper === 0) {
    console.log("\nAdding approved customer reviews for SGT Clipper...");
    const clipperReviews = [
      { name: "Vicky Sharma", business: "Vicky Unisex Barber Shop", city: "Mumbai", rating: 5, comment: "The motor torque on this SGT clipper is phenomenal. We use it daily for skin fades, zero lag or pulling. Highly recommended for busy barbershops." },
      { name: "Deepak Rawat", business: "Rawat Grooming Lounge", city: "Delhi", rating: 5, comment: "Battery life easily lasts our whole 10-hour shift without charging. The gold lever and weight balance feel very premium." },
      { name: "Pritesh Patel", business: "Crown Cuts Studio", city: "Ahmedabad", rating: 5, comment: "Bought 6 units for our salon staff. Wholesale pricing at 5+ units saved us a lot. Blades cut smooth like butter." },
      { name: "Sameer Khan", business: "Urban Edge Hair Salon", city: "Pune", rating: 5, comment: "Zero-gapping out of the box was spot on. Solid build quality and fast USB-C charging." }
    ];
    for (const r of clipperReviews) {
      const customer = await prisma.customer.create({
        data: {
          name: r.name,
          email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          phone: `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`,
          passwordHash: "demo-hash-password",
          businessProfile: {
            create: {
              businessName: r.business,
              businessType: BusinessType.BARBERSHOP,
              gstNumber: `27${Math.random().toString(36).substring(2, 12).toUpperCase()}1Z5`,
            }
          }
        }
      });
      await prisma.review.create({
        data: {
          productId: clipperProduct.id,
          customerId: customer.id,
          rating: r.rating,
          comment: r.comment,
          status: ReviewStatus.APPROVED,
        }
      });
    }
  }

  const reviewsCountShears = await prisma.review.count({ where: { productId: shearsProduct.id } });
  if (reviewsCountShears === 0) {
    console.log("Adding approved customer reviews for Salon Pro Shears...");
    const shearsReviews = [
      { name: "Anand Verma", business: "Style & Blade Barbers", city: "Bengaluru", rating: 5, comment: "Extremely sharp Japanese steel shears. The tension adjustment key works smoothly and finger rest makes long cutting sessions comfortable." },
      { name: "Rohan Gupta", business: "Elite Hair Academy", city: "Lucknow", rating: 5, comment: "We ordered 12 kits for our academy students. Outstanding quality, nice leather pouch packaging." },
      { name: "Suresh Yadav", business: "Royal Touch Salon", city: "Jaipur", rating: 5, comment: "Smooth slice cutting without pulling hair. Clean weight distribution and great price for a full kit." },
      { name: "Manish Nair", business: "Pro Cutz Studio", city: "Kochi", rating: 5, comment: "Best 6-inch shears in this price segment. Holds razor edge even after months of daily salon use." }
    ];
    for (const r of shearsReviews) {
      const customer = await prisma.customer.create({
        data: {
          name: r.name,
          email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          phone: `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`,
          passwordHash: "demo-hash-password",
          businessProfile: {
            create: {
              businessName: r.business,
              businessType: BusinessType.BARBERSHOP,
              gstNumber: `27${Math.random().toString(36).substring(2, 12).toUpperCase()}1Z5`,
            }
          }
        }
      });
      await prisma.review.create({
        data: {
          productId: shearsProduct.id,
          customerId: customer.id,
          rating: r.rating,
          comment: r.comment,
          status: ReviewStatus.APPROVED,
        }
      });
    }
  }

  console.log("\n✅ All SGT Clipper & Salon Pro Shears product records and reviews created & updated successfully!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
