import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
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

async function uploadToCloudinary(buf, filename, publicId, folder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder, public_id: publicId, overwrite: "true", timestamp };

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
    name: "Cream & Gold Luxury Hydraulic Salon Styling Chair",
    slug: "cream-gold-hydraulic-salon-styling-chair",
    sku: "SGT-FUR-CREAM-GOLD-CHAIR",
    categorySlug: "salon-furniture",
    folder: "shree-gopi-traders/products/salon-furniture",
    localPath: "public/products/salon-furniture",
    brand: "Grandeur Salon Furniture",
    basePrice: 18500,
    description:
      "Ultra-chic cream champagne leatherette hydraulic styling chair featuring polished stainless steel hollow square armrests, heavy hydraulic lift pump, integrated footrest bar, and heavy-duty mirror-finished square base.",
    specs: {
      "Product Type": "Hydraulic Styling Chair",
      "Color Theme": "Champagne Cream Upholstery with Polished Steel Frame",
      "Hydraulic Base": "Heavy Duty 200kg Load-Bearing Stainless Steel Disc Base",
      "Armrest Design": "Geometric Open Stainless Steel Frame with Padded Arm Pads",
      "Professional Use": "High-End Beauty Salons, Hair Studios & Bridal Parlours",
    },
    variants: [
      { name: "Cream (Square Base)", sku: "SGT-FUR-CREAM-SQ", price: 18500 },
      { name: "Cream (Gold Base)", sku: "SGT-FUR-CREAM-GOLD", price: 19800 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Stunning cream and gold styling chair! The polished stainless steel armrests look very high-end.",
      },
      {
        rating: 5,
        comment: "Super plush seating. Our salon clients love the extra cushioning for haircut and blow-dry sessions.",
      },
      {
        rating: 4,
        comment: "Smooth hydraulic lift and 360-degree lockable swivel base.",
      },
      {
        rating: 5,
        comment: "Fast shipping with solid crate packing from Shree Gopi Traders.",
      },
    ],
  },
  {
    name: "Professional Hairdresser Appliance & Tool Combo Kit",
    slug: "professional-hair-dresser-styling-tool-combo-kit",
    sku: "SGT-BAR-TOOL-KIT-PRO",
    categorySlug: "barber-supplies",
    folder: "shree-gopi-traders/products/barber-supplies",
    localPath: "public/products/barber-supplies",
    brand: "Salon Care Professional",
    basePrice: 8950,
    description:
      "Complete 10-piece professional hair styling equipment combo set. Includes 2200W ionic salon hair dryer, ceramic hair straightener flat iron, curling barrel wand, haircutting & thinning shears, round thermal brushes, and continuous mist spray bottle.",
    specs: {
      "Includes": "Hair Dryer, Hair Straightener, Curling Wand, 2 Shears, 2 Brushes, Spray Bottle, Combs",
      "Dryer Power": "2200W AC Motor Heavy-Duty Ionic Dryer",
      "Flat Iron": "Ceramic Tourmaline Floating Plates up to 230°C",
      "Professional Use": "Turnkey Tool Set for Salon Stylists & Barber Workstations",
    },
    variants: [
      { name: "Complete 10-Piece Styling Kit", sku: "SGT-BAR-TOOL-KIT-10PC", price: 8950 },
      { name: "Deluxe 15-Piece Styling Kit", sku: "SGT-BAR-TOOL-KIT-15PC", price: 12500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Must-have toolkit for new hair stylists! High power dryer and smooth ceramic straightener.",
      },
      {
        rating: 5,
        comment: "Great quality shears and thermal brushes included. Excellent value package deal.",
      },
      {
        rating: 4,
        comment: "Spray bottle gives very fine mist. Tools feel professional and durable.",
      },
      {
        rating: 5,
        comment: "Authentic original salon equipment. Prompt B2B delivery.",
      },
    ],
  },
  {
    name: "Luxury Pedicure Spa Chair with Hydrotherapy Foot Bath & Massage",
    slug: "luxury-pedicure-spa-chair-hydrotherapy-foot-bath",
    sku: "SGT-FUR-PEDICURE-SPA-CHAIR",
    categorySlug: "salon-furniture",
    folder: "shree-gopi-traders/products/salon-furniture",
    localPath: "public/products/salon-furniture",
    brand: "Sanitec Professional",
    basePrice: 42500,
    description:
      "Luxury pedicure spa station featuring multi-function shiatsu back massage chair, real teakwood armrests, LED whirlpool hydrotherapy foot bath tub, adjustable footrest cushion, and handheld remote controller.",
    specs: {
      "Massage System": "Multi-Mode Shiatsu Back & Neck Roller Massage with Remote",
      "Foot Basin": "Pipe-free Whirlpool Hydrotherapy Jet Basin with RGB Mood Light",
      "Upholstery": "Waterproof Chemical-Resistant Commercial Grade Leatherette",
      "Plumbing": "Hot & Cold Water Inlets with Built-in Drain Pump",
      "Professional Use": "Nail Bars, Pedicure Lounges & Luxury Day Spas",
    },
    variants: [
      { name: "Cream & Teakwood Spa Chair", sku: "SGT-FUR-PEDI-CREAM", price: 42500 },
      { name: "Black & Teakwood Spa Chair", sku: "SGT-FUR-PEDI-BLACK", price: 42500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Ultimate pedicure spa chair! Our clients rave about the back massage and whirlpool foot bath during spa pedicures.",
      },
      {
        rating: 5,
        comment: "Teakwood armrests and smooth leatherette give a 7-star resort feel to our nail salon.",
      },
      {
        rating: 4,
        comment: "Easy plumbing setup and quiet hydrotherapy jets.",
      },
      {
        rating: 5,
        comment: "Safely packaged in heavy wood crate. Outstanding B2B purchase.",
      },
    ],
  },
  {
    name: "Master Salon Hairdresser Appliance & Accessories Suite",
    slug: "master-salon-appliance-accessories-suite",
    sku: "SGT-BAR-MASTER-SUITE",
    categorySlug: "barber-supplies",
    folder: "shree-gopi-traders/products/barber-supplies",
    localPath: "public/products/barber-supplies",
    brand: "MasterCraft Professional",
    basePrice: 11500,
    description:
      "All-in-one circular layout hair styling master workstation setup kit. Features dual pro blow dryers, cordless hair clippers & trimmers, curling tongs, titanium flat iron, salon rollers, carbon tail combs, and Japanese steel scissors.",
    specs: {
      "Suite Includes": "2 Hair Dryers, Cordless Clipper Set, Flat Iron, Curling Wand, Shears, Rollers, Combs",
      "Clipper Motor": "9000 RPM Rotary Motor with Titanium Blades & Digital Display",
      "Scissors": "6.0 inch Japanese 440C Stainless Steel Convex Edge Shears",
      "Professional Use": "Full Station Setup for Professional Hairdressers & Barbers",
    },
    variants: [
      { name: "Master Barber Suite - Black & Red", sku: "SGT-BAR-MASTER-BLKRED", price: 11500 },
      { name: "Master Barber Suite - Full Chrome", sku: "SGT-BAR-MASTER-CHROME", price: 13800 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Complete salon hair tool setup! Cordless clippers hold battery for days, and the dryers are super powerful.",
      },
      {
        rating: 5,
        comment: "High quality Japanese steel scissors included in the box. Incredible value.",
      },
      {
        rating: 4,
        comment: "Everything fits neatly on salon workstation carts.",
      },
      {
        rating: 5,
        comment: "Fast delivery by Shree Gopi Traders. Verified original products.",
      },
    ],
  },
  {
    name: "Professional 2-in-1 Facial Steamer & Hair Steamer Machine",
    slug: "professional-2in1-facial-hair-steamer-machine",
    sku: "SGT-EQ-2IN1-FACIAL-HAIR-STEAMER",
    categorySlug: "professional-equipment",
    folder: "shree-gopi-traders/products/professional-equipment",
    localPath: "public/products/professional-equipment",
    brand: "Salon Care Professional",
    basePrice: 7800,
    description:
      "Dual-function professional 2-in-1 facial ozone steamer and hair spa steamer hood. Equipped with height-adjustable telescopic pole, 360-degree swivel wheels, dual switches, independent water reservoirs, and auto shut-off safety sensor.",
    specs: {
      "Functionality": "Ozone Facial Mist Steamer + Deep Conditioning Hair Spa Hood Steamer",
      "Safety": "Automatic Low Water Level Shut-Off Protection",
      "Mobility": "Heavy Duty Height Adjustable Stand with 5 Rolling Caster Wheels",
      "Power & Voltage": "750W Dual Element / 220V Salon Grade Operation",
      "Professional Use": "Hair Spa Treatments, Skin Hydration & Pre-Extraction Facials",
    },
    variants: [
      { name: "Standard 2-in-1 Steamer - Silver/Black", sku: "SGT-EQ-STEAMER-2IN1-STD", price: 7800 },
      { name: "Digital 2-in-1 Steamer - White/Gold", sku: "SGT-EQ-STEAMER-2IN1-DIGITAL", price: 9500 },
    ],
    reviews: [
      {
        rating: 5,
        comment: "Saves so much space! 2-in-1 steamer works fantastically for both hair spa treatments and facial client clean-ups.",
      },
      {
        rating: 5,
        comment: "Ozone mist opens pores fast, and the hair hood conditions deep dry hair.",
      },
      {
        rating: 4,
        comment: "Easy to assemble rolling stand. Solid build quality.",
      },
      {
        rating: 5,
        comment: "Great price for a dual machine. GST invoice received.",
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
  console.log("=== ADDING LATEST 5 EQUIPMENT & SALON PRODUCTS WITH 4 REVIEWS EACH ===");

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

  for (const item of PRODUCTS) {
    console.log(`\nProcessing ${item.name}...`);

    let category = await prisma.category.findUnique({ where: { slug: item.categorySlug } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: item.categorySlug.replace("-", " ").toUpperCase(),
          slug: item.categorySlug,
          description: `Category for ${item.categorySlug}`,
          isActive: true,
        }
      });
    }

    const cUrls = [];
    const localDir = path.join(process.cwd(), item.localPath);
    for (let i = 1; i <= 3; i++) {
      const fileName = i === 1 ? `${item.slug}.png` : `${item.slug}-${i}.png`;
      const localPath = path.join(localDir, fileName);
      const publicId = i === 1 ? item.slug : `${item.slug}-${i}`;

      if (existsSync(localPath)) {
        const buf = readFileSync(localPath);
        console.log(`Uploading ${fileName} to Cloudinary folder ${item.folder}...`);
        const url = await uploadToCloudinary(buf, fileName, publicId, item.folder);
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

  console.log("\n✅ ALL 5 LATEST EQUIPMENT PRODUCTS ADDED WITH 4 APPROVED REVIEWS EACH!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
