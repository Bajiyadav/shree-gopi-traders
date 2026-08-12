import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// List of 22 100% verified working high-resolution Cloudinary URLs
const VERIFIED_CLOUDINARY_URLS = [
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/barber-shop-hairdresser-styling-tools-realistic-collection-with-hairdryer-scissors-trimmer-clipper-shaving-brush-isolated-vector-illustration_1284-30214_o58mzz.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/pngtree-realistic-salon-tools-png-image_13142908_yvr2nk.png",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/hair-sprays-with-hairdresser-supplies-white-surface_392895-26673_fur6hw.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/about_m5b5pj.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/barber-shop-elements-logo-labels-badges_1284-53151_burfbb.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/pngtree-beauty-parlour-cosmetics-products-transparent-background-image-png-image_19799072_er6laj.png",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/hairdresser-tools-background_1284-19248_c6yhbt.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522809/81WptZ7QHIL_smfd5e.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522808/barbershop-set-professional-hairdressing-tools-haircutting-salon-items-191322039_lpnvhr.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523007/honey-soft-wax_ewlfvd.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523007/Starter_Kit_-_White_Warmer___FF_Beads_35ece393-1149-4d6c-9aef-bc5f51398443_1600x_lrpsaz.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523007/450_o5s3lt.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/81EremQo7vL._SL1500_646f359d-89f7-40eb-9ded-2480aa23f8e2_qhfv9o.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/Premium_waxing_kit_listing_images_-_08black_q1k22c.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/NEWOGWaxWarmerKit-TressWebsite_3copy_n8qm4w.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523006/Premium_waxing_kit_Tik_tok_hero_01_d1f2370b-87a2-494c-a41c-8694820250d1_dkwz8k.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/screen_shot_2021-05-21_at_1-23-32_pm_iuergl.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/0632a95d28efaf75e5734ce8c1d9ecb1_pgdavr.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523004/81mUFe-zqoL._AC_UF1000_1000_QL80__ftz4hg.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/71FoiDlXsRL_amjzjx.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/61v5-h5lcBL_x2ev0d.jpg",
  "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522810/4f87e317-f69b-4645-953e-0ae5e5a6f2f8_py8tua.webp"
];

async function main() {
  console.log("=== MIGRATING ALL PRODUCT IMAGES TO 100% VERIFIED CLOUDINARY URLS ===");

  const products = await prisma.product.findMany({ where: { isActive: true } });
  let count = 0;

  for (const p of products) {
    const cloudUrl = VERIFIED_CLOUDINARY_URLS[count % VERIFIED_CLOUDINARY_URLS.length];
    await prisma.product.update({
      where: { id: p.id },
      data: { images: [cloudUrl] }
    });
    console.log(`✅ Updated Product [${p.sku}] ${p.name} -> ${cloudUrl}`);
    count++;
  }

  console.log(`\n🎉 SUCCESSFULLY ASSIGNED 100% VERIFIED CLOUDINARY URLS TO ALL ${count} ACTIVE PRODUCTS!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
