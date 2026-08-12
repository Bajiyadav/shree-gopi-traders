import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRAIN_DIR = "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6";
const PUBLIC_PRODUCTS_DIR = path.join(process.cwd(), "public", "images", "products");
const PUBLIC_BANNERS_DIR = path.join(process.cwd(), "public", "images", "banners");

if (!fs.existsSync(PUBLIC_PRODUCTS_DIR)) fs.mkdirSync(PUBLIC_PRODUCTS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_BANNERS_DIR)) fs.mkdirSync(PUBLIC_BANNERS_DIR, { recursive: true });

// Copy artifacts to public folder
const ARTIFACT_MAP = [
  { src: "hero_banner_salon_supplies_1786509602403.png", dest: "banners/hero-banner-salon-supplies.png" },
  { src: "wholesale_b2b_warehouse_banner_1786509680129.png", dest: "banners/b2b-warehouse-banner.png" },
  { src: "luxury_spa_equipment_showcase_1786509705895.png", dest: "banners/spa-equipment-banner.png" },
  { src: "igora_zero_amm_tube_box_1786509900262.png", dest: "products/igora-zero-amm-tube-box.png" },
  { src: "igora_zero_amm_cream_swatch_1786509918690.png", dest: "products/igora-zero-amm-cream-swatch.png" },
  { src: "streax_spa_mask_jar_front_1786509935966.png", dest: "products/streax-spa-mask-jar-front.png" },
  { src: "streax_spa_mask_creamy_texture_1786510258732.png", dest: "products/streax-spa-mask-creamy-texture.png" },
  { src: "iconic_radiance_booster_bottle_1786510278489.png", dest: "products/iconic-radiance-booster-bottle.png" },
  { src: "iconic_radiance_booster_swatch_1786510336431.png", dest: "products/iconic-radiance-booster-swatch.png" },
  { src: "iconic_contour_stick_open_1786510357116.png", dest: "products/iconic-contour-stick-open.png" },
  { src: "iconic_contour_stick_swatches_1786510586896.png", dest: "products/iconic-contour-stick-swatches.png" },
  { src: "styling_chair_front_angle_1786510830722.png", dest: "products/styling-chair-front-angle.png" },
  { src: "styling_chair_side_hydraulic_1786510845815.png", dest: "products/styling-chair-side-hydraulic.png" }
];

async function main() {
  console.log("=== INTEGRATING ALL GENERATED STUDIO IMAGES & MULTI-ANGLE GALLERIES ===");

  for (const item of ARTIFACT_MAP) {
    const srcPath = path.join(BRAIN_DIR, item.src);
    const destPath = path.join(process.cwd(), "public", "images", item.dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`📁 Copied artifact [${item.src}] -> public/images/${item.dest}`);
    }
  }

  // 1. Igora Zero Amm
  const igora = await prisma.product.findFirst({ where: { slug: { contains: "igora-zero-amm" } } });
  if (igora) {
    await prisma.product.update({
      where: { id: igora.id },
      data: {
        images: ["/images/products/igora-zero-amm-tube-box.png", "/images/products/igora-zero-amm-cream-swatch.png"]
      }
    });
    console.log(`🖼️ Updated Igora Zero Amm gallery with 2 generated studio images`);
  }

  // 2. Hair Spa Treatment Cream
  const spaMask = await prisma.product.findFirst({ where: { slug: { contains: "spa-treatment-cream" } } });
  if (spaMask) {
    await prisma.product.update({
      where: { id: spaMask.id },
      data: {
        images: ["/images/products/streax-spa-mask-jar-front.png", "/images/products/streax-spa-mask-creamy-texture.png"]
      }
    });
    console.log(`🖼️ Updated Hair Spa Cream gallery with 2 generated studio images`);
  }

  // 3. Create or update Iconic London Radiance Booster
  let makeupCat = await prisma.category.findFirst({ where: { slug: "makeup" } });
  if (makeupCat) {
    const radianceBooster = await prisma.product.findFirst({ where: { slug: "iconic-london-radiance-booster-glow-primer" } });
    if (!radianceBooster) {
      await prisma.product.create({
        data: {
          sku: "SGT-MKP-RADIANCE-BOOSTER-50ML",
          name: "Iconic London Radiance Booster Glow Primer (50ml)",
          slug: "iconic-london-radiance-booster-glow-primer",
          brand: "Iconic London",
          description: "Sheer complexion enhancer enriched with oleo-gel and luminosity pearls for a luminous glass-skin glow.",
          specs: { volume: "50ml", finish: "Radiant Dewy Glow", formulation: "Liquid Primer" },
          basePrice: 1850,
          moq: 1,
          images: ["/images/products/iconic-radiance-booster-bottle.png", "/images/products/iconic-radiance-booster-swatch.png"],
          isActive: true,
          categoryId: makeupCat.id,
          variants: {
            create: {
              sku: "SGT-MKP-RADIANCE-BOOSTER-50ML-STD",
              name: "Original Dewy Glow",
              price: 2450,
              salePrice: 1850,
              isActive: true,
              inventory: { create: { stock: 35, lowStockThreshold: 5 } }
            }
          }
        }
      });
      console.log(`✨ Created Product [Iconic London Radiance Booster Glow Primer] with 2 generated studio images`);
    } else {
      await prisma.product.update({
        where: { id: radianceBooster.id },
        data: {
          images: ["/images/products/iconic-radiance-booster-bottle.png", "/images/products/iconic-radiance-booster-swatch.png"],
          isActive: true
        }
      });
      console.log(`🖼️ Updated Iconic London Radiance Booster gallery`);
    }

    // 4. Create or update Iconic London Precision Contour Stick
    const contourStick = await prisma.product.findFirst({ where: { slug: "iconic-london-precision-contour-shading-stick" } });
    if (!contourStick) {
      await prisma.product.create({
        data: {
          sku: "SGT-MKP-CONTOUR-STICK-DUO",
          name: "Iconic London Precision Contour & Shading Stick",
          slug: "iconic-london-precision-contour-shading-stick",
          brand: "Iconic London",
          description: "Dual-ended creamy contour stick for effortless cheekbone sculpting and nose definition.",
          specs: { weight: "10g", texture: "Cream-to-Powder Matte", shades: "Medium Deep" },
          basePrice: 1450,
          moq: 1,
          images: ["/images/products/iconic-contour-stick-open.png", "/images/products/iconic-contour-stick-swatches.png"],
          isActive: true,
          categoryId: makeupCat.id,
          variants: {
            create: {
              sku: "SGT-MKP-CONTOUR-STICK-DUO-STD",
              name: "Medium Sculpt",
              price: 1950,
              salePrice: 1450,
              isActive: true,
              inventory: { create: { stock: 40, lowStockThreshold: 5 } }
            }
          }
        }
      });
      console.log(`✨ Created Product [Iconic London Precision Contour Stick] with 2 generated studio images`);
    } else {
      await prisma.product.update({
        where: { id: contourStick.id },
        data: {
          images: ["/images/products/iconic-contour-stick-open.png", "/images/products/iconic-contour-stick-swatches.png"],
          isActive: true
        }
      });
      console.log(`🖼️ Updated Iconic London Precision Contour Stick gallery`);
    }
  }

  // 5. Nordic Hydraulic Styling Chair
  const stylingChair = await prisma.product.findFirst({ where: { slug: { contains: "nordic-professional-hydraulic" } } });
  if (stylingChair) {
    await prisma.product.update({
      where: { id: stylingChair.id },
      data: {
        images: ["/images/products/styling-chair-front-angle.png", "/images/products/styling-chair-side-hydraulic.png"]
      }
    });
    console.log(`🖼️ Updated Nordic Hydraulic Styling Chair gallery with 2 generated studio images`);
  }

  console.log("\n🎉 ALL GENERATED STUDIO IMAGES INTEGRATED WITH MULTI-ANGLE GALLERIES!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
