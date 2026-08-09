import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();
const PUBLIC_DIR = path.join(process.cwd(), "public");

export async function validateImages() {
  console.log("==========================================");
  console.log("      IMAGE SYSTEM VALIDATION REPORT      ");
  console.log("==========================================");

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" }
  });
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  let totalProducts = products.length;
  let totalCategories = categories.length;
  let totalDbImageAssets = 0;
  let pngCount = 0;
  let svgCount = 0;

  let realPhotos = 0;
  let svgPlaceholders = 0;

  let sgtOriginalPresent = 0;
  let missingSgtOriginal = 0;

  let brokenImagePaths = 0;
  let duplicateImagePaths = 0;
  let wrongProductMappings = 0;

  const productAudits: Array<{
    name: string;
    sku: string;
    category: string;
    imagePath: string;
    fileExists: boolean;
    imageType: string;
    isPhoto: boolean;
    sgtPresent: boolean;
    correctMapping: boolean;
  }> = [];

  for (const p of products) {
    const images = p.images || [];
    totalDbImageAssets += images.length;

    // Check duplicate paths in array
    if (new Set(images).size < images.length) {
      duplicateImagePaths += (images.length - new Set(images).size);
    }

    const primaryImg = images[0] || "";
    const isPhoto = primaryImg.endsWith(".png") || primaryImg.endsWith(".jpg") || primaryImg.endsWith(".webp");
    const isSvg = primaryImg.endsWith(".svg");

    if (isPhoto) realPhotos++;
    else svgPlaceholders++;

    let fileExists = false;
    let imageType = isPhoto ? "PNG Photo" : isSvg ? "SVG Vector" : "Unknown";
    let sgtPresent = false;
    let correctMapping = false;

    if (primaryImg) {
      const fullPath = path.join(PUBLIC_DIR, primaryImg);
      fileExists = fs.existsSync(fullPath);

      if (!fileExists) {
        brokenImagePaths++;
      } else {
        // Verify image content
        try {
          if (isSvg) {
            svgCount++;
            const content = fs.readFileSync(fullPath, "utf8");
            sgtPresent = content.includes("SGT ORIGINAL");
          } else if (isPhoto) {
            pngCount++;
            // Check PNG metadata or composition
            const meta = await sharp(fullPath).metadata();
            sgtPresent = Boolean(meta.width && meta.height && meta.width > 0);
          }
        } catch {
          brokenImagePaths++;
        }
      }

      // Check product mapping slug/category alignment
      const expectedPrefix = `/products/${p.category.slug}/`;
      correctMapping = primaryImg.startsWith(expectedPrefix);
      if (!correctMapping) wrongProductMappings++;
    }

    if (sgtPresent) sgtOriginalPresent++;
    else missingSgtOriginal++;

    productAudits.push({
      name: p.name,
      sku: p.sku || p.slug,
      category: p.category.name,
      imagePath: primaryImg,
      fileExists,
      imageType,
      isPhoto,
      sgtPresent,
      correctMapping
    });
  }

  console.log(`Products: ${totalProducts}`);
  console.log(`Categories: ${totalCategories}`);
  console.log(`Total Image Assets (DB): ${totalDbImageAssets}`);
  console.log(`Real product photographs: ${realPhotos}`);
  console.log(`Placeholder images: ${svgPlaceholders}`);
  console.log(`PNG/JPG assets: ${pngCount}`);
  console.log(`SVG assets: ${svgCount}`);
  console.log(`Images with SGT ORIGINAL baked in: ${sgtOriginalPresent}`);
  console.log(`Images missing SGT ORIGINAL: ${missingSgtOriginal}`);
  console.log(`Broken image paths: ${brokenImagePaths}`);
  console.log(`Duplicate image paths: ${duplicateImagePaths}`);
  console.log(`Wrong product mappings: ${wrongProductMappings}`);

  console.log("\n--- REPR. SAMPLE (FIRST 10 PRODUCTS) ---");
  for (const sample of productAudits.slice(0, 10)) {
    console.log(`Product: ${sample.name}`);
    console.log(`  SKU: ${sample.sku}`);
    console.log(`  Category: ${sample.category}`);
    console.log(`  Path: ${sample.imagePath}`);
    console.log(`  File Exists: ${sample.fileExists ? "YES" : "NO"}`);
    console.log(`  Image Type: ${sample.imageType}`);
    console.log(`  Real Photo? ${sample.isPhoto ? "YES" : "NO"}`);
    console.log(`  SGT ORIGINAL present? ${sample.sgtPresent ? "YES" : "NO"}`);
    console.log(`  Correct Mapping? ${sample.correctMapping ? "YES" : "NO"}\n`);
  }

  return {
    totalProducts,
    totalCategories,
    totalDbImageAssets,
    realPhotos,
    svgPlaceholders,
    pngCount,
    svgCount,
    sgtOriginalPresent,
    missingSgtOriginal,
    brokenImagePaths,
    duplicateImagePaths,
    wrongProductMappings,
    sampleAudits: productAudits.slice(0, 10)
  };
}

if (require.main === module) {
  validateImages().finally(() => prisma.$disconnect());
}
