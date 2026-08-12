import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient, ReviewStatus, BusinessType } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products/professional-equipment";

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
    name: "Luxury Black & Gold Hydraulic Salon Styling Chair & Station Set",
    slug: "luxury-black-gold-hydraulic-salon-styling-chair",
    sku: "SGT-EQ-LUX-BLACK-GOLD",
    brand: "Grandeur Salon Equipment",
    basePrice: 18500,
    description:
      "High-end luxury salon styling chair featuring heavy-duty hydraulic pump, 360-degree lockable swivel base, matte black leatherette upholstery, and gold electroplated stainless steel accents. Paired with matching round LED vanity mirror.",
    specs: {
      "Product Type": "Hydraulic Salon Styling Chair & Station Set",
      "Base & Frame": "Gold Electroplated Stainless Steel Frame",
      "Upholstery": "High-Density Molded Foam with Premium PU Leatherette",
      "Hydraulic Pump": "Heavy-Duty 200kg Load-Bearing Lockable Pump",
      "Mirror": "Built-in Touch-Sensor Dimmable LED Vanity Mirror",
      "Professional Use": "Premium Luxury Salons & Barber Lounges",
    },
    variants: [
      { name: "Single Styling Chair", sku: "SGT-EQ-LUX-CHAIR-SINGLE", price: 18500 },
      { name: "Pair (2 Chairs + 2 LED Mirrors)", sku: "SGT-EQ-LUX-STATION-PAIR", price: 34900 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Absolutely stunning black & gold aesthetic! Transformed our salon interior into a 5-star luxury lounge.",
      },
      {
        rating: 5,
        comment: "Heavy duty hydraulic pump moves smoothly without jerks. Clients find the cushion support extremely comfortable.",
      },
      {
        rating: 4,
        comment: "Gold finish is scratch resistant and easy to clean. High quality professional investment.",
      },
      {
        rating: 5,
        comment: "Fast shipping with solid wooden crate packaging. Delivered safely by Shree Gopi Traders.",
      },
    ],
  },
  {
    name: "Professional UV Sterilizer Cabinet & Facial Reclining Chair Station",
    slug: "professional-uv-sterilizer-cabinet-facial-reclining-chair",
    slug: "professional-uv-sterilizer-cabinet-facial-reclining-chair",
    sku: "SGT-EQ-UV-FACIAL-STATION",
    brand: "Sanitec Professional",
    basePrice: 24500,
    description:
      "Hospital-grade UV-C towel & tool sterilizer cabinet paired with multi-angle hydraulic reclining facial / threading / lash extension chair. Ensures 99.9% germ disinfection for tools and scissors.",
    specs: {
      "Sterilization Tech": "UV-C Germicidal Light + Heated Towel Warmer Cabinet",
      "Capacity": "23 Litres (Holds 30-40 Salon Towels or Tool Trays)",
      "Chair Feature": "Full Reclining Hydraulic Facial Chair with Adjustable Headrest",
      "Power Rating": "250W / 220V Medical Grade Sterilization",
      "Professional Use": "Beauty Parlours, Spas & Skin Clinics",
    },
    variants: [
      { name: "UV Sterilizer Unit Only", sku: "SGT-EQ-UV-CABINET-ONLY", price: 7950 },
      { name: "Complete Facial Station (Sterilizer + Chair)", sku: "SGT-EQ-UV-FACIAL-FULL", price: 24500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Essential hygiene station for every parlour! Clients feel very confident seeing tools sterilized in front of them.",
      },
      {
        rating: 5,
        comment: "The facial chair reclines smoothly to 180 degrees for threading, facial, and lash services.",
      },
      {
        rating: 4,
        comment: "UV cabinet warms towels fast and sterilizes scissors thoroughly.",
      },
      {
        rating: 5,
        comment: "Must-have B2B purchase for salon compliance. Great GST invoice support.",
      },
    ],
  },
  {
    name: "Modern Nordic Aesthetic Plush Salon Styling Chair",
    slug: "modern-nordic-aesthetic-salon-styling-chair",
    sku: "SGT-EQ-NORDIC-AESTHETIC",
    brand: "Kube Decor",
    basePrice: 14500,
    description:
      "Minimalist Nordic aesthetic salon chair upholstered in soft beige micro-velvet leatherette with natural wooden armrest accents and heavy-duty circular chrome hydraulic disc base.",
    specs: {
      "Design Style": "Modern Nordic Minimalist Aesthetic",
      "Upholstery": "Soft-Touch Waterproof Stain-Resistant Leatherette",
      "Frame Material": "Natural Teak-Stained Wood Armrests & Chrome Disc Base",
      "Height Range": "Adjustable Hydraulic Lift 45cm to 60cm",
      "Professional Use": "Boutique Salons, Hair Studios & Bridal Rooms",
    },
    variants: [
      { name: "Cream Beige (Chrome Base)", sku: "SGT-EQ-NORDIC-CREAM-CHROME", price: 14500 },
      { name: "Cream Beige (Gold Base)", sku: "SGT-EQ-NORDIC-CREAM-GOLD", price: 16200 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Super chic Nordic design! The cream plush leatherette and wood armrests match our boho salon theme perfectly.",
      },
      {
        rating: 5,
        comment: "Very soft cushioning for long hair coloring appointments. Hydraulic lift is silent and responsive.",
      },
      {
        rating: 4,
        comment: "Stain resistant coating makes hair dye wipe off easily with warm water.",
      },
      {
        rating: 5,
        comment: "Excellent build quality. Order arrived intact in 3 days.",
      },
    ],
  },
  {
    name: "Minimalist Full-Length Backlit LED Salon Wall Mirror & Hydraulic Station",
    slug: "minimalist-full-length-backlit-led-salon-wall-mirror",
    sku: "SGT-EQ-LED-MIRROR-STATION",
    brand: "Lumiere Mirror Craft",
    basePrice: 19800,
    description:
      "Sleek full-length arch illuminated salon wall mirror featuring 3-color ambient LED backlighting (Warm White, Cool Daylight, Natural Neutral) with touch sensor dimmer paired with ergonomic hydraulic styling chair.",
    specs: {
      "Mirror Dimensions": "6.5 Feet Height x 2.5 Feet Width Full Length Glass",
      "Lighting System": "Smart Touch Dual-LED Strip (3 Color Temperature Modes)",
      "Glass Spec": "5mm Copper-Free Anti-Fog Shatterproof HD Mirror",
      "Station Accessories": "Integrated Under-Mirror Hairdryer Holder Shelf",
      "Professional Use": "Makeup Studios, Hair Salons & Bridal Parlours",
    },
    variants: [
      { name: "Arch Mirror + Black Hydraulic Chair", sku: "SGT-EQ-LED-ARCH-BLACK", price: 19800 },
      { name: "Arch Mirror + Gold Hydraulic Chair", sku: "SGT-EQ-LED-ARCH-GOLD", price: 21500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "The LED backlight provides flawless lighting for bridal makeup and hair photography! No harsh shadows.",
      },
      {
        rating: 5,
        comment: "Touch sensor dimming is super slick. Copper-free glass gives crystal-clear reflections.",
      },
      {
        rating: 4,
        comment: "Easy wall mounting system. Includes integrated blow dryer holder shelf.",
      },
      {
        rating: 5,
        comment: "100% recommended for modern salon owners. Premium build quality.",
      },
    ],
  },
  {
    name: "Master Workstation 3D Salon Furniture & Trolley Suite",
    slug: "master-workstation-3d-salon-furniture-suite",
    slug: "master-workstation-3d-salon-furniture-suite",
    sku: "SGT-EQ-MASTER-SALON-SUITE",
    brand: "Architectural Salon Systems",
    basePrice: 48000,
    description:
      "Architectural 3D salon workstation package. Complete setup including 4 hydraulic styling chairs, 2 wash basin shampoo units, 4 illuminated LED mirror stations, and 4 lockable roll-about equipment trolleys.",
    specs: {
      "Suite Includes": "4 Styling Chairs + 2 Shampoo Chairs + 4 LED Mirrors + 4 Trolleys",
      "Trolley Feature": "5 Drawers with Appliance Cutouts & Lockable Wheels",
      "Shampoo Basin": "Tilting Ceramic Sink with Hot/Cold Faucet & Neck Rest",
      "Warranty": "2 Years Manufacturer Warranty on Hydraulics",
      "Professional Use": "New Salon Turnkey Setup & Full Renovation",
    },
    variants: [
      { name: "Full 4-Station Salon Package", sku: "SGT-EQ-SUITE-FULL-4STATION", price: 48000 },
      { name: "Deluxe 6-Station Salon Package", sku: "SGT-EQ-SUITE-FULL-6STATION", price: 68500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "The complete turnkey package for opening a new salon! Saved us huge time and money ordering all furniture together.",
      },
      {
        rating: 5,
        comment: "High quality shampoo basins and heavy duty hydraulic chairs. Everything fits seamlessly.",
      },
      {
        rating: 4,
        comment: "The roll-about trolleys keep all tools organized and clutter-free.",
      },
      {
        rating: 5,
        comment: "Outstanding customer service and B2B pricing from Shree Gopi Traders.",
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
  console.log("=== ADDING SALON EQUIPMENT & FURNITURE RANGE WITH 4 REVIEWS EACH ===");

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

  let category = await prisma.category.findUnique({ where: { slug: "professional-equipment" } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Professional Equipment",
        slug: "professional-equipment",
        description: "Heavy salon equipment, styling chairs, LED mirrors, sterilizers, facial beds and workstation furniture.",
        isActive: true,
      }
    });
  }

  const localDir = path.join(process.cwd(), "public/products/professional-equipment");

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
        update: { stock: 25, lowStockThreshold: 2 },
        create: { productVariantId: variant.id, stock: 25, lowStockThreshold: 2 },
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

  console.log("\n✅ ALL 5 SALON EQUIPMENT PRODUCTS ADDED WITH 4 APPROVED REVIEWS EACH!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
