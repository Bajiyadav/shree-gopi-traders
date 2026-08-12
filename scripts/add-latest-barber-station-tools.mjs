import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LATEST_ATTACHED = [
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786525147609.png",
    destName: "barber-station-clipper-trimmer-set.png",
    sku: "SGT-BRB-STATION-CLIPPER-TRIMMER-SET",
    name: "Professional Barber Station Cordless Clipper & Gold Skeleton Trimmer Set",
    slug: "professional-barber-station-cordless-clipper-gold-skeleton-trimmer-set",
    brand: "ProLuxe Barber Supplies",
    categorySlug: "barber-supplies",
    basePrice: 5450,
    description: "Heavy-duty barber workstation mat displaying deep red cordless hair clipper, gold skeleton zero-gap detail trimmer, straight razor, cutting comb, and blade cleaning brush.",
    specs: { clippers: "7200 RPM High-Torque Cordless Clipper", trimmer: "360-Degree Exposed Skeleton T-Blade", accessories: "Barber Mat, Razor, Comb & Cleaning Brush" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786525166565.png",
    destName: "ionic-high-velocity-salon-blow-dryer.png",
    sku: "SGT-BRB-IONIC-BLOW-DRYER-GREY-STD",
    name: "Professional Ionic High-Velocity Salon Blow Dryer Grey",
    slug: "professional-ionic-high-velocity-salon-blow-dryer-grey",
    brand: "ProLuxe Barber Supplies",
    categorySlug: "barber-supplies",
    basePrice: 2450,
    description: "Sleek metallic silver-grey ergonomic ionic salon blow dryer with ceramic heating element, cool shot button, and lightweight professional motor.",
    specs: { power: "2200W Professional AC Motor", tech: "Negative Ion Frizz Control", settings: "3 Heat & 2 Speed Controls" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786525194660.png",
    destName: "barber-spray-bottle-neck-duster-set.png",
    sku: "SGT-BRB-SPRAY-NECK-DUSTER-SET",
    name: "Professional Barber Continuous Spray Bottle & Neck Duster Set",
    slug: "professional-barber-continuous-spray-bottle-neck-duster-set",
    brand: "Grandeur Salon Equipment",
    categorySlug: "barber-supplies",
    basePrice: 850,
    description: "Barber station countertop set including vintage glass continuous fine mist spray bottle, Barbicide sanitizer jar, and natural wooden handle goat hair neck duster brush.",
    specs: { spray: "Continuous 360 Fine Water Mist (300ml)", duster: "Soft Wooden Handle Neck Brush", jar: "Heavy Glass Disinfectant Sanitizing Jar" }
  }
];

async function main() {
  console.log("=== COPYING LATEST BARBER STATION MEDIA & UPDATING DB RECORDS ===");

  const targetDir = path.join(process.cwd(), "public", "images", "products");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const item of LATEST_ATTACHED) {
    const destPath = path.join(targetDir, item.destName);
    fs.copyFileSync(item.src, destPath);
    console.log(`📁 Copied file to: ${destPath}`);

    const relativeImageUrl = `/images/products/${item.destName}`;

    // Get category ID
    const cat = await prisma.category.findFirst({ where: { slug: item.categorySlug } });
    if (!cat) continue;

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { sku: item.sku },
          { slug: item.slug }
        ]
      }
    });

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
      console.log(`🔄 Updated Product [${existing.sku}] -> ${item.name}`);
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
              name: "Standard Set",
              price: Math.round(item.basePrice * 1.25),
              salePrice: item.basePrice,
              isActive: true,
              inventory: {
                create: {
                  stock: 25,
                  lowStockThreshold: 5
                }
              }
            }
          }
        }
      });
      console.log(`✨ Created Product [${item.sku}] -> ${item.name}`);
    }
  }

  console.log("\n🎉 LATEST ATTACHED BARBER STATION PRODUCTS SUCCESSFULLY UPDATED!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
