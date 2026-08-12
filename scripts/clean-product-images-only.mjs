import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// List of generic background/category banner images that should NEVER be on individual product cards
const GENERIC_BANNER_IMAGES = [
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
  console.log("=== CLEANING PRODUCT IMAGE ARRAYS (REMOVING GENERIC BANNERS FROM PRODUCTS) ===");

  const products = await prisma.product.findMany({
    where: { isActive: true }
  });

  let cleanedCount = 0;

  for (const prod of products) {
    const originalImages = prod.images || [];
    const filteredImages = originalImages.filter(img => !GENERIC_BANNER_IMAGES.includes(img));

    // If all images were generic, keep the non-generic image if available or fallback
    const finalImages = filteredImages.length > 0 ? filteredImages : originalImages;

    if (JSON.stringify(originalImages) !== JSON.stringify(finalImages)) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { images: finalImages }
      });
      console.log(`✅ Cleaned images for product [${prod.name}] -> Now has ${finalImages.length} direct product photo(s).`);
      cleanedCount++;
    }
  }

  console.log(`\n🎉 CLEANED ${cleanedCount} PRODUCT RECORDS IN DB!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
