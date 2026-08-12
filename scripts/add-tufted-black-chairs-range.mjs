import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/salon-furniture";

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
  form.append("file", new Blob([new Uint8Array(buf)]), filename);
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
    name: "Diamond Tufted Crystal-Studded Black Hydraulic Styling Chair",
    slug: "diamond-tufted-crystal-black-hydraulic-styling-chair",
    sku: "SGT-FUR-TUFTED-CRYSTAL-BLK",
    brand: "Grandeur Salon Furniture",
    basePrice: 17500,
    description:
      "Glamorous diamond-tufted salon styling chair upholstered in high-density black leatherette featuring embedded crystal buttons on side armrests, 360° lockable swivel, heavy hydraulic pump, and mirror-finished square base.",
    specs: {
      "Product Type": "Diamond Tufted Crystal-Studded Hydraulic Styling Chair",
      "Armrest Design": "Diamond Lattice Tufted Armrest Panels with Crystal Buttons",
      "Hydraulic Base": "Heavy-Duty Square Mirror-Finished Stainless Steel Disc Base",
      "Upholstery": "High-Resilience Molded Foam & Matte Black PU Leatherette",
      "Load Capacity": "200 kg Heavy Duty Hydraulic Pump",
      "Professional Use": "Bridal Parlours, Premium Beauty Salons & Makeup Studios",
    },
    variants: [
      { name: "Matte Black (Square Chrome Base)", sku: "SGT-FUR-TUFTED-BLK-SQ", price: 17500 },
      { name: "Matte Black (Gold Base)", sku: "SGT-FUR-TUFTED-BLK-GOLD", price: 19200 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "The embedded crystal studs look extremely glamorous! Adds a high-end luxury feel to our bridal makeup station.",
      },
      {
        rating: 5,
        comment: "Super comfy cushion and side tufted padding. Clients love sitting on this chair for long hair treatments.",
      },
      {
        rating: 4,
        comment: "Very sturdy square hydraulic base. Doesn't wobble at all during haircutting.",
      },
      {
        rating: 5,
        comment: "Excellent packaging and fast dispatch by Shree Gopi Traders.",
      },
    ],
  },
  {
    name: "Black Geometric Hollow Chrome Armrest Reclining Salon Chair",
    slug: "black-geometric-hollow-chrome-armrest-reclining-chair",
    sku: "SGT-FUR-HOLLOW-ARM-BLK",
    brand: "MasterCraft Furniture",
    basePrice: 16800,
    description:
      "Modern black reclining parlour & haircutting chair featuring geometric hollow stainless steel armrests with padded top cushion, side recline lever, adjustable headrest, and heavy square hydraulic base.",
    specs: {
      "Product Type": "Reclining Hydraulic Parlour & Haircut Chair",
      "Armrest Feature": "Architectural Hollow Metallic Frame Armrests",
      "Recline Feature": "Integrated Recline Lever with Adjustable Removable Headrest",
      "Hydraulic Base": "Square Mirror-Finished Heavy-Duty Hydraulic Base",
      "Professional Use": "Unisex Salons, Barbering & Threading Workstations",
    },
    variants: [
      { name: "Matte Black (Square Base)", sku: "SGT-FUR-HOLLOW-BLK-SQ", price: 16800 },
      { name: "Matte Black (Round Base)", sku: "SGT-FUR-HOLLOW-BLK-RD", price: 15900 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Sleek geometric armrests and solid hydraulic elevation! Highly durable salon chair.",
      },
      {
        rating: 5,
        comment: "Smooth recline mechanism for facials and threadings. Perfect for unisex salons.",
      },
      {
        rating: 4,
        comment: "Wipes clean easily from hair dye and water splashes. Great value.",
      },
      {
        rating: 5,
        comment: "Received intact with GST tax invoice. Great B2B service.",
      },
    ],
  },
];

const SAMPLE_CUSTOMERS = [
  { name: "Priya Sharma", email: "priya.beauty@salonmail.com", phone: "9876543210", bName: "Priya Beauty Parlour", bType: BusinessType.PARLOUR },
  { name: "Sunita Verma", email: "sunita.glam@salonmail.com", phone: "9876543211", bName: "Sunita Glamour Studio", bType: BusinessType.SALON },
  { name: "Rajesh Kumar", email: "rajesh.barber@salonmail.com", phone: "9876543212", bName: "Royal Cuts Barber Shop", bType: BusinessType.BARBERSHOP },
  { name: "Vikram Singh", email: "vikram.salon@salonmail.com", phone: "9876543215", bName: "Urban Style Unisex Salon", bType: BusinessType.SALON }
];

async function main() {
  console.log("=== ADDING NEW TUFTED BLACK SALON CHAIRS WITH 4 REVIEWS EACH ===");

  const customerIds = [];
  for (const cData of SAMPLE_CUSTOMERS) {
    let cust = await prisma.customer.findUnique({ where: { email: cData.email } });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          name: cData.name,
          email: cData.email,
          phone: cData.phone,
          passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
          businessProfile: { create: { businessName: cData.bName, businessType: cData.bType } }
        }
      });
    }
    customerIds.push(cust.id);
  }

  let category = await prisma.category.findUnique({ where: { slug: "salon-furniture" } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Salon Furniture",
        slug: "salon-furniture",
        description: "Hydraulic styling chairs, barber chairs, facial beds, shampoo stations, manicure tables and waiting lounge seating.",
        isActive: true,
      }
    });
  }

  const localDir = path.join(process.cwd(), "public/products/salon-furniture");

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
      console.log(`Updating product ID: ${product.id}`);
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
        update: { stock: 20, lowStockThreshold: 2 },
        create: { productVariantId: variant.id, stock: 20, lowStockThreshold: 2 },
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

    await prisma.review.deleteMany({ where: { productId: product.id } });

    console.log(`  Adding ${item.reviews.length} approved reviews...`);
    const now = new Date();
    for (let rIdx = 0; rIdx < item.reviews.length; rIdx++) {
      const rev = item.reviews[rIdx];
      const custId = customerIds[rIdx % customerIds.length];
      const randomDaysAgo = Math.floor(Math.random() * 30) + 1;
      const reviewDate = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

      await prisma.review.create({
        data: {
          productId: product.id,
          customerId: custId,
          rating: rev.rating,
          comment: rev.comment,
          status: ReviewStatus.APPROVED,
          createdAt: reviewDate,
        },
      });
    }
  }

  console.log("\n✅ BOTH TUFTED BLACK SALON CHAIR PRODUCTS ADDED WITH 4 APPROVED REVIEWS EACH!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
