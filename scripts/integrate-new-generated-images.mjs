import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GENERATED_ASSETS = [
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/salon_hair_treatment_serum_bottle_1786545925886.png",
    destName: "salon-hair-treatment-serum-bottle.png",
    sku: "SGT-HC-ARGAN-SERUM-DROPPER-STD",
    name: "Moroccan Argan Intensive Hair Elixir Oil (100ml Dropper)",
    slug: "moroccan-argan-intensive-hair-elixir-oil-100ml-dropper"
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/barber_cordless_fade_clipper_gold_1786545950031.png",
    destName: "barber-cordless-fade-clipper-gold.png",
    sku: "SGT-BRB-PRO-CORDLESS-HAIR-CLIPPER-STD",
    name: "High-Torque Rotary Motor Cordless Barber Hair Clipper Gold",
    slug: "high-torque-rotary-motor-cordless-barber-hair-clipper-gold"
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/spa_facial_mask_clay_jar_1786546099569.png",
    destName: "spa-facial-mask-clay-jar.png",
    sku: "SGT-SKIN-NIACINAMIDE-GLOW-CREAM-STD",
    name: "10% Niacinamide Skin Brightening Day Cream (100g Jar)",
    slug: "10-niacinamide-skin-brightening-day-cream-100g-jar"
  },
  {
    src: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/hair_shampoo_bottle_pump_1786546122757.png",
    destName: "hair-shampoo-bottle-pump.png",
    sku: "SGT-HC-KERATIN-SHAMPOO-1000ML-STD",
    name: "Professional Keratin Repair Shampoo (1000ml Pump Bottle)",
    slug: "professional-keratin-repair-shampoo-1000ml-pump-bottle"
  }
];

async function main() {
  console.log("=== INTEGRATING NEW GENERATED STUDIO IMAGES ===");

  const targetDir = path.join(process.cwd(), "public", "images", "products");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const item of GENERATED_ASSETS) {
    if (fs.existsSync(item.src)) {
      const destPath = path.join(targetDir, item.destName);
      fs.copyFileSync(item.src, destPath);
      console.log(`📁 Copied generated image to: ${destPath}`);

      const relUrl = `/images/products/${item.destName}`;

      const prod = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: item.sku },
            { slug: item.slug }
          ]
        }
      });

      if (prod) {
        await prisma.product.update({
          where: { id: prod.id },
          data: {
            images: [relUrl],
            isActive: true
          }
        });
        console.log(`✅ Updated Product [${prod.sku}] -> Image: ${relUrl}`);
      }
    }
  }

  console.log("\n🎉 ALL GENERATED ASSETS INTEGRATED SUCCESSFULLY!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
