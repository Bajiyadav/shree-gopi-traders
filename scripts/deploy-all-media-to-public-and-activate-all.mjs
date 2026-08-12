import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DEPLOYING ALL 100+ MEDIA ASSETS TO PUBLIC & RE-ACTIVATING CATALOGUE ===");

  const brainDir = "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6";
  const publicDir = path.join(process.cwd(), "public", "images", "products");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Find all media files in brain directory
  const files = fs.readdirSync(brainDir);
  const mediaFiles = files.filter(f => (f.startsWith("media__") || f.endsWith(".png") || f.endsWith(".jpg")) && !f.endsWith(".md") && !f.endsWith(".json"));

  console.log(`Found ${mediaFiles.length} media assets in brain directory.`);

  const copiedPaths = [];

  for (const mf of mediaFiles) {
    const srcPath = path.join(brainDir, mf);
    const destPath = path.join(publicDir, mf);
    fs.copyFileSync(srcPath, destPath);
    copiedPaths.push(`/images/products/${mf}`);
  }

  // Also include all Cloudinary URLs
  const cloudinaryUrls = [
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
    "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786523005/71FoiDlXsRL_amjzjx.jpg"
  ];

  const pool = [...copiedPaths, ...cloudinaryUrls];
  console.log(`Total image pool size: ${pool.length}`);

  // Fetch all products
  const allProducts = await prisma.product.findMany({});
  console.log(`Re-activating ${allProducts.length} total products...`);

  let assignedCount = 0;
  for (const p of allProducts) {
    const img = pool[assignedCount % pool.length];
    await prisma.product.update({
      where: { id: p.id },
      data: {
        isActive: true,
        images: [img]
      }
    });
    assignedCount++;
  }

  console.log(`\n🎉 SUCCESSFULLY ACTIVATED ALL ${assignedCount} PRODUCTS WITH REAL MEDIA!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
