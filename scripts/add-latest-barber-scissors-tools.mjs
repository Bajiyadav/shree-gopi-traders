import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LATEST_ATTACHED = [
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524884951.png",
    destName: "japanese-barber-shears-tray-set.png",
    sku: "SGT-JAGUAR-RELAX-SLICE-55-SET",
    name: "Jaguar Pre-Style Relax Slice Hairdressing Scissors 5.5 Inch Set",
    slug: "jaguar-pre-style-relax-slice-hairdressing-scissors-set",
    brand: "Jaguar Solingen",
    categorySlug: "barber-supplies",
    basePrice: 4850,
    description: "German-engineered 5.5-inch ergonomic offset hair cutting shears with satin finish micro-serrated hollow ground blades for precise salon styling.",
    specs: { size: "5.5 Inch (14 cm)", material: "Stainless German Chrome Steel", tension: "SMART-SPINNER Screw System" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524909882.jpg",
    destName: "leather-shear-case-titanium-scissors.jpg",
    sku: "SGT-BRB-LEATHER-SHEAR-CASE-SET",
    name: "Professional Leather Shear Case & Titanium Scissors Set",
    slug: "professional-leather-shear-case-titanium-scissors-set",
    brand: "ProLuxe Barber Supplies",
    categorySlug: "barber-supplies",
    basePrice: 3950,
    description: "Premium genuine leather scissor holster case with slot inserts containing Japanese titanium-coated hair cutting & texturizing thinning shears.",
    specs: { case: "Genuine Leather Zip Case", shears: "6.0 Inch Cutting & 30-Teeth Thinning", finish: "Titanium Rose Gold & Chrome" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524936320.png",
    destName: "salon-hair-coloring-starter-kit.png",
    sku: "SGT-BRB-COLORING-KIT-PUNCH",
    name: "Salon Hair Coloring & Tinting Starter Kit",
    slug: "salon-hair-coloring-tinting-starter-kit",
    brand: "Streax Professional",
    categorySlug: "hair-care-treatments",
    basePrice: 1250,
    description: "Handheld mannequin salon training & coloring kit featuring matte black cutting shears, carbon anti-static tail comb, and pink tint brush.",
    specs: { brush: "Ergonomic Tint Brush", comb: "Carbon Fiber Pin Tail Comb", shears: "Black Matte Trimming Shear" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524949499.png",
    destName: "barber-sectioning-tool-master-kit.png",
    sku: "SGT-BRB-SECTIONING-TOOL-SET",
    name: "Professional Barber Sectioning Combs & Clips Master Kit",
    slug: "professional-barber-sectioning-combs-clips-master-kit",
    brand: "Grandeur Salon Equipment",
    categorySlug: "barber-supplies",
    basePrice: 1650,
    description: "Comprehensive flat-lay kit of salon cutting shears, thermal vent brushes, carbon cutting combs, alligator sectioning clips, and neck brushes.",
    specs: { items: "12-Piece Master Tool Set", material: "Heat-Resistant Carbon Polymer", usage: "Professional Barber & Stylist" }
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/media__1786524963725.png",
    destName: "salon-blowout-styling-tools-set.png",
    sku: "SGT-BRB-STYLING-BLOWOUT-SET",
    name: "Salon Blowout Thermal Brushes & Styling Tools Set",
    slug: "salon-blowout-thermal-brushes-styling-tools-set",
    brand: "ProLuxe Barber Supplies",
    categorySlug: "hair-care-treatments",
    basePrice: 2450,
    description: "Master hair styling collection featuring ceramic thermal round barrel brushes, wide-tooth detangling combs, flat irons, and sectioning hair clips.",
    specs: { brushes: "Ceramic Barrel Round Brushes", iron: "Gold Titanium Flat Iron", clips: "Non-Slip Alligator Sectioning Clips" }
  }
];

async function main() {
  console.log("=== COPYING LATEST BARBER TOOL MEDIA & UPDATING DB RECORDS ===");

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
                  stock: 30,
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

  console.log("\n🎉 LATEST ATTACHED BARBER TOOL PRODUCTS SUCCESSFULLY UPDATED!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
