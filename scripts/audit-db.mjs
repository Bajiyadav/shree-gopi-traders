import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  
  let totalProducts = products.length;
  let productsWithoutImages = 0;
  let totalImages = 0;
  let mdmImages = 0;
  let aiGeneratedImages = 0;
  let otherImages = 0;
  let imageUsageMap = new Map();
  
  const genuineBrands = [
    "L'OREAL", "MATRIX", "BIOLAGE", "RAAGA", "KRONE", "DREAMRON", 
    "BIO KERATIN", "ASTA BERRY", "LILIUM", "AROMA MAGIC", "RICHLON", 
    "RICA", "STREAX", "SCHWARZKOPF", "WELLA", "SP", "SGT", "SALON PRO"
  ].map(b => b.toLowerCase());
  
  let genuineProducts = 0;

  for (const p of products) {
    if (p.images.length === 0) {
      productsWithoutImages++;
    }
    
    totalImages += p.images.length;
    
    for (const img of p.images) {
      if (img.includes("cloudinary.com")) {
        mdmImages++;
      } else if (img.includes("/images/products/")) {
        aiGeneratedImages++;
      } else {
        otherImages++;
      }
      
      imageUsageMap.set(img, (imageUsageMap.get(img) || 0) + 1);
    }
    
    // Check if brand is genuine
    const pBrand = p.brand ? p.brand.toLowerCase() : "";
    let isGenuine = false;
    for (const b of genuineBrands) {
      if (pBrand.includes(b)) {
        isGenuine = true;
        break;
      }
    }
    // Alternatively, if it has an MDM image, it's genuine
    if (p.images.some(img => img.includes("cloudinary.com"))) {
      isGenuine = true;
    }
    
    if (isGenuine) {
      genuineProducts++;
    }
  }

  let duplicateImages = 0;
  for (const [img, count] of imageUsageMap.entries()) {
    if (count > 1) {
      duplicateImages++; // or count - 1 if we mean duplicate instances
    }
  }

  console.log("=== DB AUDIT ===");
  console.log("Products currently:", totalProducts);
  console.log("Genuine products:", genuineProducts);
  console.log("Total images in DB:", totalImages);
  console.log("MDM images:", mdmImages);
  console.log("AI-generated images:", aiGeneratedImages);
  console.log("Other images:", otherImages);
  console.log("Duplicate images (URLs used >1 time):", duplicateImages);
  console.log("Products without images:", productsWithoutImages);
  
  const brandCounts = {};
  for (const p of products) {
    const b = p.brand ? p.brand.toUpperCase() : "NO BRAND";
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  }
  console.log("Brands:", brandCounts);

  await prisma.$disconnect();
}

main().catch(console.error);
