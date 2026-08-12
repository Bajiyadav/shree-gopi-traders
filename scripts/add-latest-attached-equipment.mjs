import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LATEST_ATTACHED = [
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524684612.png",
    destName: "stand-facial-ozone-steamer-lamp.png",
    sku: "SGT-EQ-STAND-FACIAL-OZONE-STEAMER-STD",
    name: "Commercial Stand Facial Ozone Steamer with LED Magnifying Lamp",
    slug: "commercial-stand-facial-ozone-steamer-led-magnifying-lamp",
    brand: "Grandeur Salon Equipment",
    categorySlug: "professional-equipment",
    basePrice: 4250,
    description: "Rolling base heavy-duty facial ozone steamer with 5x LED magnifying glass lamp arm for clinical skincare extraction and hydration.",
    specs: { steam: "Ozone Ionized Vapor", lamp: "5X LED Magnifying Glass", base: "5-Star Rolling Caddy" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524690810.png",
    destName: "standing-hair-steamer-hood-dryer.png",
    sku: "SGT-EQ-STANDING-HAIR-STEAMER-SINGLE",
    name: "Professional Standing Hair Steamer & Hood Dryer Machine",
    slug: "professional-standing-hair-steamer-hood-dryer-machine",
    brand: "Grandeur Salon Equipment",
    categorySlug: "professional-equipment",
    basePrice: 6850,
    description: "Salon grade bonnet hair steamer and conditioning hood dryer with adjustable height, timer control, and temperature settings for hair treatments.",
    specs: { power: "650W Heavy-Duty", hood: "Adjustable Smoked Bonnet", timer: "60-Minute Auto Shut-Off" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524695522.png",
    destName: "led-ring-light-18inch-kit.png",
    sku: "SGT-EQ-RING-LIGHT-18INCH-KIT-STD",
    name: "18-Inch Dimmable LED Ring Light Stand Kit with Smartphone Holder",
    slug: "18-inch-dimmable-led-ring-light-stand-kit-smartphone-holder",
    brand: "ProLuxe Salon Equipment",
    categorySlug: "professional-equipment",
    basePrice: 2950,
    description: "18-inch bi-color LED ring light with digital display, heavy-duty light stand, phone mount, and wireless remote for makeup artists and salon photography.",
    specs: { diameter: "18 Inch / 48cm", temp: "3200K - 5600K Bi-Color", CRI: "95+ Ultra-Accurate" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524714690.jpg",
    destName: "facial-ozone-steamer-combo-station.jpg",
    sku: "SGT-EQ-TABLETOP-FACIAL-OZONE-STEAMER-STD",
    name: "2-in-1 Facial Ozone Steamer & Magnifying Lamp Combo Station",
    slug: "2-in-1-facial-ozone-steamer-magnifying-lamp-combo-station",
    brand: "Grandeur Salon Equipment",
    categorySlug: "professional-equipment",
    basePrice: 5200,
    description: "Integrated dual-arm professional facial steamer with active steam mist wand and adjustable spring-arm LED magnifying inspection lamp.",
    specs: { steam: "High-Output Active Steam Mist", lamp: "Spring-Balance LED Magnifier", base: "Heavy-Duty Rolling Base" }
  }
];

async function main() {
  console.log("=== COPYING LATEST EQUIPMENT MEDIA & UPDATING DB RECORDS ===");

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
                  stock: 25,
                  lowStockThreshold: 3
                }
              }
            }
          }
        }
      });
      console.log(`✨ Created Product [${item.sku}] -> ${item.name}`);
    }
  }

  console.log("\n🎉 LATEST ATTACHED EQUIPMENT PRODUCTS SUCCESSFULLY UPDATED!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
