import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ATTACHED_MEDIA = [
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786523431138.png",
    destName: "led-vanity-mirror-station.png",
    sku: "SGT-EQ-VANITY-MIRROR-LED",
    name: "LED Illuminated Desktop Vanity Mirror Station with Touch Dimmer",
    slug: "led-illuminated-desktop-vanity-mirror-station-touch-dimmer",
    brand: "ProLuxe Salon Equipment",
    categorySlug: "professional-equipment",
    basePrice: 4850,
    description: "Ultra-bright LED border illuminated salon vanity mirror with heavy-duty metal tabletop stand and touch-sensitive dimming.",
    specs: { power: "12V Adapter Included", frame: "Brushed Aluminum", dimming: "Touch Control 0-100%" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786523445697.png",
    destName: "electric-nail-drill-system-35000rpm.png",
    sku: "SGT-NAIL-DRILL-35000RPM-PRO",
    name: "Commercial 35,000 RPM Electric Nail Drill System with Digital Display",
    slug: "commercial-35000rpm-electric-nail-drill-system-digital-display",
    brand: "ProNail Tech",
    categorySlug: "professional-equipment",
    basePrice: 3850,
    description: "Professional grade manicure and pedicure e-file nail drill machine with digital RPM display, forward/reverse modes, and low vibration handpiece.",
    specs: { speed: "35,000 RPM Max", display: "Digital LED Screen", control: "Hand & Foot Pedal Dual Control" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786523453399.png",
    destName: "luxury-pedicure-spa-chair.png",
    sku: "SGT-FUR-PEDICURE-SPA-CHAIR-LUX",
    name: "Luxury Pedicure Spa Chair Unit with Hydrotherapy Foot Bath",
    slug: "luxury-pedicure-spa-chair-unit-hydrotherapy-foot-bath",
    brand: "Nordic Spa Furniture",
    categorySlug: "salon-furniture",
    basePrice: 42500,
    description: "Full-function luxury pedicure throne featuring pipeless jet hydrotherapy foot tub, adjustable footrest, side manicure trays, and ergonomic reclining seat.",
    specs: { tub: "Pipeless Whirlpool Jet", upholstery: "Stain-Resistant Cream Leatherette", capacity: "180kg Max Weight" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786523461319.png",
    destName: "electric-hydraulic-facial-massage-bed.png",
    sku: "SGT-FUR-FACIAL-BED-HYDRAULIC-ELECTRIC",
    name: "Commercial Electric Hydraulic Facial & Massage Treatment Table",
    slug: "commercial-electric-hydraulic-facial-massage-treatment-table",
    brand: "Nordic Spa Furniture",
    categorySlug: "salon-furniture",
    basePrice: 38900,
    description: "Heavy-duty 3-section electric hydraulic treatment couch for facial aesthetics, tattooing, and spa body massage with removable headrest pillow.",
    specs: { lift: "Electric Motorized Height Adjustment", backrest: "Manual Gas-Spring Recline", base: "Solid Stainless Steel Chassis" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786523469288.png",
    destName: "salon-shampoo-backwash-station.png",
    sku: "SGT-FUR-BACKWASH-SHAMPOO-QUILTED",
    name: "Executive Quilted Leather Salon Shampoo Backwash Station with Ceramic Basin",
    slug: "executive-quilted-leather-salon-shampoo-backwash-station-ceramic-basin",
    brand: "Nordic Spa Furniture",
    categorySlug: "salon-furniture",
    basePrice: 28500,
    description: "Ergonomic salon wash basin backwash chair with diamond-quilted dark grey leather upholstery, tilting deep ceramic bowl, and chrome faucet sprayer.",
    specs: { basin: "Tilting White Ceramic Bowl", faucet: "UPC Certified Mixer & Spray Hose", seat: "High-Density Foam Diamond Quilted" }
  }
];

async function main() {
  console.log("=== COPYING MEDIA FILES & CREATING EQUIPMENT PRODUCTS ===");

  const targetDir = path.join(process.cwd(), "public", "images", "products");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const item of ATTACHED_MEDIA) {
    const destPath = path.join(targetDir, item.destName);
    fs.copyFileSync(item.src, destPath);
    console.log(`📁 Copied file to: ${destPath}`);

    const relativeImageUrl = `/images/products/${item.destName}`;

    // Get category ID
    const cat = await prisma.category.findFirst({ where: { slug: item.categorySlug } });
    if (!cat) {
      console.error(`Category ${item.categorySlug} not found!`);
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { sku: item.sku } });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          images: [relativeImageUrl],
          basePrice: item.basePrice,
          isActive: true
        }
      });
      console.log(`🔄 Updated Product [${item.sku}] -> ${item.name}`);
    } else {
      await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          slug: item.slug,
          brand: item.brand,
          description: item.description,
          specs: item.specs,
          basePrice: item.basePrice,
          moq: 1,
          images: [relativeImageUrl],
          isActive: true,
          categoryId: cat.id,
          variants: {
            create: {
              sku: `${item.sku}-STD`,
              name: "Standard Unit",
              price: Math.round(item.basePrice * 1.25),
              salePrice: item.basePrice,
              isActive: true,
              inventory: {
                create: {
                  stock: 15,
                  lowStockThreshold: 2
                }
              }
            }
          }
        }
      });
      console.log(`✨ Created Product [${item.sku}] -> ${item.name}`);
    }
  }

  console.log("\n🎉 ATTACHED EQUIPMENT PRODUCTS SUCCESSFULLY INTEGRATED!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
