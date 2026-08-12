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
    name: "Charcoal Grey Reclining Hydraulic Facial & Barber Chair",
    slug: "charcoal-grey-reclining-hydraulic-facial-barber-chair",
    sku: "SGT-FUR-CHARCOAL-GREY",
    brand: "Grandeur Salon Furniture",
    basePrice: 16500,
    description:
      "Modern charcoal grey reclining barber & facial chair featuring metallic hollow geometric armrests, heavy-duty square chrome hydraulic base, adjustable headrest, and 160-degree smooth backrest recline lever for facial, threading and haircutting services.",
    specs: {
      "Product Type": "Reclining Hydraulic Facial & Barber Chair",
      "Base & Frame": "Stainless Steel Square Hydraulic Disc Base & Hollow Chrome Armrests",
      "Recline Range": "160-Degree Lever Recline with Adjustable Removable Headrest",
      "Upholstery": "High-Resilience Molded Foam & Matte Charcoal PU Leatherette",
      "Load Capacity": "200 kg Heavy Duty Hydraulic Pump",
      "Professional Use": "Men's Barbering, Women's Threading & Facial Treatments",
    },
    variants: [
      { name: "Charcoal Grey (Square Base)", sku: "SGT-FUR-CHARCOAL-GREY-SQ", price: 16500 },
      { name: "Charcoal Grey (Round Base)", sku: "SGT-FUR-CHARCOAL-GREY-RD", price: 15800 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Excellent chair for multi-purpose salon services! Reclines effortlessly for threadings and facials.",
      },
      {
        rating: 5,
        comment: "The geometric chrome armrests look super sleek in our salon. Solid heavy-duty hydraulic pump.",
      },
      {
        rating: 4,
        comment: "Very plush seating foam. Clients stay comfortable even during 1-hour facial services.",
      },
      {
        rating: 5,
        comment: "Prompt delivery with wooden crate protection. Highly recommended B2B purchase.",
      },
    ],
  },
  {
    name: "SAKHI Luxury Emerald Green Quilted Hydraulic Styling Chair",
    slug: "sakhi-emerald-green-quilted-hydraulic-styling-chair",
    slug: "sakhi-emerald-green-quilted-hydraulic-styling-chair",
    sku: "SGT-FUR-SAKHI-EMERALD",
    brand: "Sakhi Salon Furniture",
    basePrice: 19500,
    description:
      "Ultra-luxurious emerald green diamond-quilted salon styling chair. Features contoured ergonomic bucket seating, polished chrome side inserts, integrated stainless footrest, and heavy square hydraulic base.",
    specs: {
      "Brand": "SAKHI Salon Furniture & Equipment",
      "Color & Texture": "Royal Emerald Green with Diamond Lattice Quilted Stitching",
      "Upholstery": "Commercial Grade Stain & Chemical Resistant Leatherette",
      "Base & Footrest": "Square Brushed Chrome Hydraulic Base with Tubular Footrest",
      "Professional Use": "Premium Luxury Salons, Bridal Studios & Makeup Parlours",
    },
    variants: [
      { name: "Emerald Green (Square Chrome Base)", sku: "SGT-FUR-SAKHI-EMERALD-CHROME", price: 19500 },
      { name: "Emerald Green (Gold Titanium Base)", sku: "SGT-FUR-SAKHI-EMERALD-GOLD", price: 21800 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Sakhi brand emerald green chair is stunning! The quilted diamond stitching adds a royal touch to our studio.",
      },
      {
        rating: 5,
        comment: "Extremely wide and comfortable seat bucket. Hair dye wipes off easily without staining.",
      },
      {
        rating: 4,
        comment: "Smooth hydraulic elevation and 360-degree lockable swivel function.",
      },
      {
        rating: 5,
        comment: "Authentic Sakhi equipment. Received with GST invoice and 2-year warranty card.",
      },
    ],
  },
  {
    name: "Executive Matte Black Reclining Barber Chair",
    slug: "executive-matte-black-reclining-barber-chair",
    sku: "SGT-FUR-EXEC-MATTE-BLACK",
    brand: "MasterCraft Furniture",
    basePrice: 17800,
    description:
      "Classic executive barber reclining chair in matte black premium leatherette. Built with heavy-duty chrome hydraulic pump, integrated headrest, side recline lever, and mirror-polished square base.",
    specs: {
      "Product Type": "Executive Reclining Barber Chair",
      "Upholstery": "Heavy-Duty Matte Black High-Density PU Leatherette",
      "Hydraulic Base": "Square Mirror-Finished Stainless Steel Hydraulic Base",
      "Recline & Headrest": "Integrated Side Recline Lever & Adjustable Padded Headrest",
      "Professional Use": "Barbershops, Men's Grooming Salons & Shaving Stations",
    },
    variants: [
      { name: "Matte Black (Square Chrome Base)", sku: "SGT-FUR-EXEC-BLK-CHROME", price: 17800 },
      { name: "Matte Black (Gold Base)", sku: "SGT-FUR-EXEC-BLK-GOLD", price: 19500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Best classic barber chair! Heavy construction doesn't tilt even with 100kg+ clients during beard shaves.",
      },
      {
        rating: 5,
        comment: "Smooth recline action and comfortable padded headrest. Essential for barbershops.",
      },
      {
        rating: 4,
        comment: "High quality leatherette material. Looks fresh even after 6 months of heavy daily use.",
      },
      {
        rating: 5,
        comment: "Great wholesale deal from Shree Gopi Traders. Fast delivery.",
      },
    ],
  },
  {
    name: "Ergonomic Grey Executive Salon Waiting Lounge Chair",
    slug: "ergonomic-grey-executive-salon-waiting-lounge-chair",
    sku: "SGT-FUR-LOUNGE-GREY-CANTILEVER",
    brand: "Royalson Furniture",
    basePrice: 6850,
    description:
      "Ergonomic cantilever visitor lounge chair for salon reception areas and waiting lounges. Features plush grey ribbed cushioned seat & backrest, padded armrests, and durable chrome tubular sleigh frame.",
    specs: {
      "Product Type": "Salon Visitor & Waiting Lounge Cantilever Chair",
      "Frame Material": "Tubular Sleigh Chrome Steel Frame with Anti-Slip Foot Guards",
      "Cushioning": "Dual-Layer Ribbed Molded Foam with Grey PU Upholstery",
      "Weight Capacity": "150 kg Tested Load Bearing",
      "Professional Use": "Salon Reception Waiting Area, Receptionist Desk & VIP Lounge",
    },
    variants: [
      { name: "Single Lounge Chair", sku: "SGT-FUR-LOUNGE-SINGLE", price: 6850 },
      { name: "Set of 3 Waiting Chairs", sku: "SGT-FUR-LOUNGE-SET3", price: 18900 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Perfect waiting chair for salon reception! Very comfortable cantilever cushion support while clients wait.",
      },
      {
        rating: 5,
        comment: "Sturdy chrome sleigh frame doesn't scratch salon floor tiles. Easy to clean.",
      },
      {
        rating: 4,
        comment: "Looks professional and sleek near the reception desk. Good value for money.",
      },
      {
        rating: 5,
        comment: "Delivered intact with strong protective bubble wrap.",
      },
    ],
  },
  {
    name: "Royal Beige Gold Reclining Hydraulic Parlour Chair",
    slug: "royal-beige-gold-reclining-hydraulic-parlour-chair",
    sku: "SGT-FUR-ROYAL-BEIGE-GOLD",
    brand: "Grandeur Salon Furniture",
    basePrice: 18900,
    description:
      "Luxury beige and gold reclining parlour chair featuring gold mirror-finished side trim, 180-degree reclining backrest, adjustable headrest, and heavy-duty 24K gold electroplated hydraulic square base.",
    specs: {
      "Color & Finish": "Royal Champagne Beige Leatherette with 24K Gold Electroplated Trim",
      "Hydraulic Base": "Gold Plated Square Anti-Rust Stainless Steel Base",
      "Features": "Adjustable Headrest, Footrest Bar, Side Recline Lever",
      "Professional Use": "Bridal Makeup Parlours, Threading & Facial Clinics",
    },
    variants: [
      { name: "Beige (Gold Square Base)", sku: "SGT-FUR-BEIGE-GOLD-SQ", price: 18900 },
      { name: "Beige (Gold Round Base)", sku: "SGT-FUR-BEIGE-GOLD-RD", price: 17900 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Gorgeous beige & gold combination! Perfect chair for bridal makeup and threading.",
      },
      {
        rating: 5,
        comment: "Gold plating looks luxurious under salon warm lighting. Very comfortable recline position.",
      },
      {
        rating: 4,
        comment: "Sturdy hydraulic pump and smooth swivel movement.",
      },
      {
        rating: 5,
        comment: "Original quality product. 100% satisfied with wholesale rates.",
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
  console.log("=== ADDING SALON CHAIRS RANGE WITH 4 REVIEWS EACH ===");

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

  console.log("\n✅ ALL 5 SALON CHAIR PRODUCTS ADDED WITH 4 APPROVED REVIEWS EACH!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
