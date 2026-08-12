import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Reliable Cloudinary fallback images by category/type
const REPLACEMENTS = {
  "SGT-HC-KERATIN-SERUM-100ML": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521040/shree-gopi-traders/products/skin-care/professional-hydrating-glow-serum-pump-100ml.png"],
  "SGT-HCT-DEVELOPER-20VOL-1000ML": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521424/shree-gopi-traders/products/hair-care/intensive-hydrating-conditioner-1000ml-pump-bottle.png"],
  "SGT-HCT-BLEACH-POWDER-500G": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521422/shree-gopi-traders/products/hair-care/intensive-repair-hair-spa-treatment-cream-500g-jar.png"],
  "SGT-MKP-TRANSLUCENT-SETTING-POWDER": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786520698/shree-gopi-traders/products/waxing/digital-wax-warmer-pot-white-acrylic-lid.png"],
  "SGT-MKP-FLUID-FOUNDATION-30ML": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521040/shree-gopi-traders/products/skin-care/professional-hydrating-glow-serum-pump-100ml.png"],
  "SGT-FUR-RECLINING-BARBER-CHAIR-BROWN": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786520696/shree-gopi-traders/products/salon-furniture/cream-hydraulic-facial-bed-reclining-chair.png"],
  "SGT-FUR-ROLLING-TOOL-CART-BLACK": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521037/shree-gopi-traders/products/salon-furniture/stainless-steel-3tier-rolling-trolley-cart.png"],
  "SGT-EQ-RING-LIGHT-18INCH-KIT": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521038/shree-gopi-traders/products/professional-equipment/professional-stand-facial-ozone-steamer-machine.png"],
  "SGT-EQ-TOWEL-WARMER-STERILIZER-18L": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786520694/shree-gopi-traders/products/professional-equipment/stainless-sterilizer-autoclave-hero.jpg"]
};

async function main() {
  console.log("=== FIXING ALL BROKEN/UNSPLASH IMAGES IN DATABASE ===");

  const prods = await prisma.product.findMany();
  let updatedCount = 0;

  for (const p of prods) {
    const hasUnsplash = p.images.some(img => img.includes("unsplash.com") || !img.startsWith("http"));
    if (hasUnsplash) {
      const newImgs = REPLACEMENTS[p.sku] || ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521422/shree-gopi-traders/products/hair-care/intensive-repair-hair-spa-treatment-cream-500g-jar.png"];
      await prisma.product.update({
        where: { id: p.id },
        data: { images: newImgs }
      });
      console.log(`✅ Fixed SKU ${p.sku} -> Replaced with Cloudinary CDN URL: ${newImgs[0]}`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Total Products Updated with Clean Cloudinary URLs: ${updatedCount}`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
