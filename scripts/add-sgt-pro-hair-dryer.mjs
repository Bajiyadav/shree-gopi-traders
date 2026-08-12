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
  console.log("=== UPLOADING SGT PRO HAIR DRYER IMAGE TO CLOUDINARY ===");

  const folder = "shree-gopi-traders/products/professional-equipment";

  const imgUrl = await uploadToCloudinary(
    "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786512996242.png",
    folder,
    "sgt-pro-hair-dryer-hero"
  );
  console.log("✅ Hero Hair Dryer Image Uploaded:", imgUrl);

  const equipCategory = await prisma.category.findUnique({ where: { slug: "professional-equipment" } });
  if (!equipCategory) throw new Error("professional-equipment category not found");

  console.log("\nUpserting SGT® Professional 2400W High-Speed AC Motor Ionic Hair Dryer...");
  const dryerProduct = await prisma.product.upsert({
    where: { sku: "SGT-EQ-DRYER-2400W-ROSEGOLD" },
    update: {
      name: "SGT® Professional 2400W High-Speed AC Motor Ionic Hair Dryer",
      brand: "SGT® Professional",
      basePrice: 2450,
      moq: 1,
      images: [imgUrl],
      description: "Heavy-duty 2400W salon-grade ionic hair dryer engineered with a commercial high-speed AC motor. Encased in gunmetal matte grey with metallic rose gold accent ring, featuring advanced negative ion technology to seal hair cuticles, eliminate static frizz, and reduce drying time by 50%. Includes 3 heat / 2 speed control switches, instant cool-shot locking button, narrow concentrator nozzle, and 3-meter heavy-duty reinforced swivel cord with hanging loop.",
      specs: {
        "Power Rating": "2400 Watts Heavy Duty AC Motor",
        "Ion Technology": "Advanced Negative Ion Frizz Control",
        "Heat & Speed Settings": "3 Heat Settings, 2 Speed Modes + Cool Shot Button",
        "Finish": "Gunmetal Matte Grey with Rose Gold Metallic Accent Ring",
        "Power Cord": "3.0 Meter Professional Swivel Cord with Hanging Loop",
        "Includes": "Precision Air Concentrator Nozzle & Removable Filter Mesh"
      },
      isActive: true,
      categoryId: equipCategory.id,
    },
    create: {
      sku: "SGT-EQ-DRYER-2400W-ROSEGOLD",
      name: "SGT® Professional 2400W High-Speed AC Motor Ionic Hair Dryer",
      slug: "sgt-professional-2400w-high-speed-ionic-hair-dryer",
      brand: "SGT® Professional",
      basePrice: 2450,
      moq: 1,
      description: "Heavy-duty 2400W salon-grade ionic hair dryer engineered with a commercial high-speed AC motor. Encased in gunmetal matte grey with metallic rose gold accent ring, featuring advanced negative ion technology to seal hair cuticles, eliminate static frizz, and reduce drying time by 50%. Includes 3 heat / 2 speed control switches, instant cool-shot locking button, narrow concentrator nozzle, and 3-meter heavy-duty reinforced swivel cord with hanging loop.",
      specs: {
        "Power Rating": "2400 Watts Heavy Duty AC Motor",
        "Ion Technology": "Advanced Negative Ion Frizz Control",
        "Heat & Speed Settings": "3 Heat Settings, 2 Speed Modes + Cool Shot Button",
        "Finish": "Gunmetal Matte Grey with Rose Gold Metallic Accent Ring",
        "Power Cord": "3.0 Meter Professional Swivel Cord with Hanging Loop",
        "Includes": "Precision Air Concentrator Nozzle & Removable Filter Mesh"
      },
      images: [imgUrl],
      isActive: true,
      categoryId: equipCategory.id,
      variants: {
        create: {
          sku: "SGT-EQ-DRYER-2400W-SINGLE",
          name: "Standard Salon Pack (Gunmetal & Rose Gold)",
          price: 2990,
          salePrice: 2450,
          inventory: { create: { stock: 75 } },
          wholesaleTiers: {
            create: [
              { minQty: 1, maxQty: 4, pricePerUnit: 2450 },
              { minQty: 5, maxQty: 9, pricePerUnit: 2200 },
              { minQty: 10, maxQty: null, pricePerUnit: 1950 },
            ]
          }
        }
      }
    }
  });

  const reviewsCount = await prisma.review.count({ where: { productId: dryerProduct.id } });
  if (reviewsCount === 0) {
    console.log("\nAdding approved customer reviews for SGT Hair Dryer...");
    const dryerReviews = [
      { name: "Kavita Singhania", business: "Kavita Luxury Beauty Studio", city: "Mumbai", rating: 5, comment: "Dries thick long hair in under 8 minutes. The negative ion technology keeps hair soft and shiny without heat damage." },
      { name: "Rajesh Kumar", business: "Rajesh Unisex Salon Chain", city: "Delhi NCR", rating: 5, comment: "Bought 10 units for our styling stations. The 3-meter heavy cord and cool shot button make it ideal for non-stop salon operations." },
      { name: "Zoya Merchant", business: "Glamour & Gloss Studio", city: "Bengaluru", rating: 5, comment: "The matte gunmetal and rose gold design looks super elegant on our counter. Quiet motor and high air velocity." },
      { name: "Amit Saini", business: "Pro Hair Lounge", city: "Chandigarh", rating: 5, comment: "Excellent build quality. Does not overheat even after hours of continuous blow drying." }
    ];
    for (const r of dryerReviews) {
      const customer = await prisma.customer.create({
        data: {
          name: r.name,
          email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
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
          productId: dryerProduct.id,
          customerId: customer.id,
          rating: r.rating,
          comment: r.comment,
          status: ReviewStatus.APPROVED,
        }
      });
    }
  }

  console.log("\n✅ SGT® Professional 2400W Ionic Hair Dryer created & updated successfully!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
