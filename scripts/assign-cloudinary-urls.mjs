import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_IMAGES = [
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/61v5-h5lcBL_x2ev0d.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/4f87e317-f69b-4645-953e-0ae5e5a6f2f8_py8tua.webp",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/barber-shop-hairdresser-styling-tools-realistic-collection-with-hairdryer-scissors-trimmer-clipper-shaving-brush-isolated-vector-illustration_1284-30214_o58mzz.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/pngtree-realistic-salon-tools-png-image_13142908_yvr2nk.png",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/hair-sprays-with-hairdresser-supplies-white-surface_392895-26673_fur6hw.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/about_m5b5pj.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/barber-shop-elements-logo-labels-badges_1284-53151_burfbb.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/pngtree-beauty-parlour-cosmetics-products-transparent-background-image-png-image_19799072_er6laj.png",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/hairdresser-tools-background_1284-19248_c6yhbt.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/81WptZ7QHIL_smfd5e.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522808/barbershop-set-professional-hairdressing-tools-haircutting-salon-items-191322039_lpnvhr.jpg"
];

async function main() {
  console.log("=== ASSIGNING NEW CLOUDINARY IMAGES TO CATEGORIES & PRODUCTS ===");

  // 1. Update Category Image URLs for clean high-res display
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  console.log(`Found ${categories.length} active categories.`);

  // Map appropriate Cloudinary URLs to categories
  const categoryImageMap = {
    "barber-supplies": NEW_IMAGES[2], // barber shop tools collection
    "hair-care": NEW_IMAGES[4], // hair sprays supplies
    "makeup": NEW_IMAGES[7], // beauty parlour cosmetics
    "professional-equipment": NEW_IMAGES[3], // realistic salon tools
    "salon-furniture": NEW_IMAGES[9], // 81WptZ7QHIL
    "skin-care": NEW_IMAGES[1], // webp product shot
    "hair-color-treatment": NEW_IMAGES[8], // hairdresser tools background
    "waxing": NEW_IMAGES[0] // 61v5-h5lcBL
  };

  for (const cat of categories) {
    if (categoryImageMap[cat.slug]) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { imageUrl: categoryImageMap[cat.slug] }
      });
      console.log(`✅ Category [${cat.name}] updated image -> ${categoryImageMap[cat.slug]}`);
    }
  }

  // 2. Assign unique Cloudinary image URLs to products that can benefit from these fresh studio photos
  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: NEW_IMAGES.length
  });

  for (let i = 0; i < Math.min(activeProducts.length, NEW_IMAGES.length); i++) {
    const prod = activeProducts[i];
    const newImgUrl = NEW_IMAGES[i];

    // Ensure we replace or append this high-quality Cloudinary image as primary image
    const existingImages = prod.images || [];
    const updatedImages = [newImgUrl, ...existingImages.filter(img => img !== newImgUrl)];

    await prisma.product.update({
      where: { id: prod.id },
      data: { images: updatedImages }
    });

    console.log(`🖼️ Product [${prod.name}] updated primary image -> ${newImgUrl}`);
  }

  console.log("\n🎉 ALL NEW CLOUDINARY IMAGES ASSIGNED & DATABASE SYNCHRONIZED SUCCESSFULLY!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
