import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Verified product catalogue mappings
async function fixAndAudit() {
  console.log("=== FIXING PRODUCT IMAGES AND CROSS-WIRING ===");

  // 1. Fix Streax Shine Hair Serum
  await prisma.product.updateMany({
    where: { sku: "SGT-HC-STREAX-SHINE" },
    data: {
      images: [
        "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503710/shree-gopi-traders/products/hair-care/streax-shine-hair-serum-walnut-oil.png",
        "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503711/shree-gopi-traders/products/hair-care/streax-shine-hair-serum-walnut-oil-2.png",
        "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786503712/shree-gopi-traders/products/hair-care/streax-shine-hair-serum-walnut-oil-3.png"
      ]
    }
  });

  // 2. Fix ICONIC London Stick
  await prisma.product.updateMany({
    where: { sku: "SGT-MK-ICONIC-STICK" },
    data: {
      images: [
        "/images/products/iconic_contour_stick_open_1786510357116.png",
        "/images/products/iconic_contour_stick_swatches_1786510586896.png"
      ]
    }
  });

  // 3. Fix ICONIC London Radiance Booster
  await prisma.product.updateMany({
    where: { sku: "SGT-MK-ICONIC-RADBOOST" },
    data: {
      images: [
        "/images/products/iconic_radiance_booster_bottle_1786510278489.png",
        "/images/products/iconic_radiance_booster_swatch_1786510336431.png"
      ]
    }
  });

  // 4. Fix ICONIC London Prep-Set-Glow
  await prisma.product.updateMany({
    where: { sku: "SGT-MK-ICONIC-PREPSET" },
    data: {
      images: [
        "/images/products/iconic-radiance-booster-bottle.png",
        "/images/products/iconic-radiance-booster-swatch.png"
      ]
    }
  });

  // 5. Fix ICONIC London Primer
  await prisma.product.updateMany({
    where: { sku: "SGT-MK-ICONIC-PRIMER" },
    data: {
      images: [
        "/images/products/media__1786502267112.png",
        "/images/products/media__1786502282977.png"
      ]
    }
  });

  // 6. Fix Sharonds Scissors Set
  await prisma.product.updateMany({
    where: { sku: "SGT-SHARONDS-6IN-SET" },
    data: {
      images: [
        "/images/products/japanese-barber-shears-tray-set.png",
        "/images/products/leather-shear-case-titanium-scissors.jpg"
      ]
    }
  });

  // 7. Fix Schwarzkopf Igora Absolutes
  await prisma.product.updateMany({
    where: { sku: "SGT-HT-IGORA-ABSOLUTES" },
    data: {
      images: [
        "/images/products/igora_zero_amm_tube_box_1786509900262.png",
        "/images/products/igora_zero_amm_cream_swatch_1786509918690.png"
      ]
    }
  });

  // 8. Fix Schwarzkopf Igora Zero AMM
  await prisma.product.updateMany({
    where: { sku: "SGT-HT-IGORA-ZERO-AMM" },
    data: {
      images: [
        "/images/products/igora-zero-amm-tube-box.png",
        "/images/products/igora-zero-amm-cream-swatch.png"
      ]
    }
  });

  // 9. Fix Saffron Soap
  await prisma.product.updateMany({
    where: { sku: "MDM-SAFFRON-SOAP-150G" },
    data: {
      images: [
        "/images/products/media__1786508515695.png"
      ]
    }
  });

  // 10. Fix Neem & Aloe Soap
  await prisma.product.updateMany({
    where: { sku: "MDM-NEEM-ALOE-100G-X8" },
    data: {
      images: [
        "/images/products/media__1786524963725.png"
      ]
    }
  });

  // 11. Fix Vana Shampoo
  await prisma.product.updateMany({
    where: { sku: "MDM-VANA-SHAMPOO-300" },
    data: {
      images: [
        "/images/products/hair-shampoo-bottle-pump.png"
      ]
    }
  });

  // 12. Fix Biotin Hair Mask
  await prisma.product.updateMany({
    where: { sku: "SGT-HC-BIOTIN-HAIR-MASK-500G" },
    data: {
      images: [
        "/images/products/spa-facial-mask-clay-jar.png",
        "/images/products/streax-spa-mask-creamy-texture.png"
      ]
    }
  });

  console.log("Image fix complete.");
  await prisma.$disconnect();
}

fixAndAudit().catch(console.error);
