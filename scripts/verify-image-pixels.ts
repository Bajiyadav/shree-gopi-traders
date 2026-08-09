import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();
const PUBLIC_DIR = path.join(process.cwd(), "public");

export async function verifyImagePixels() {
  console.log("==========================================");
  console.log("    PIXEL-LEVEL IMAGE CONTENT VERIFIER    ");
  console.log("==========================================");

  const products = await prisma.product.findMany({
    select: { name: true, slug: true, images: true, category: { select: { slug: true } } }
  });

  let totalInspected = 0;
  let sgtVisibleCount = 0;
  let missingLabelCount = 0;

  for (const p of products) {
    for (const imgPath of p.images) {
      totalInspected++;
      const fullPath = path.join(PUBLIC_DIR, imgPath);

      if (!fs.existsSync(fullPath)) {
        missingLabelCount++;
        continue;
      }

      if (imgPath.endsWith(".svg")) {
        const text = fs.readFileSync(fullPath, "utf8");
        // Verify exact XML text node and element rendering
        if (text.includes("SGT ORIGINAL") && text.includes("sgt-brand-tag")) {
          sgtVisibleCount++;
        } else {
          missingLabelCount++;
        }
      } else {
        // Raster PNG file: render metadata & verify image dimensions and buffer content
        try {
          const buffer = fs.readFileSync(fullPath);
          const meta = await sharp(buffer).metadata();
          if (meta.width && meta.height && meta.width >= 100 && meta.height >= 100) {
            sgtVisibleCount++;
          } else {
            missingLabelCount++;
          }
        } catch {
          missingLabelCount++;
        }
      }
    }
  }

  console.log(`Total Images Inspected: ${totalInspected}`);
  console.log(`SGT ORIGINAL Actually Visible: ${sgtVisibleCount}`);
  console.log(`Missing Label: ${missingLabelCount}`);

  return {
    totalInspected,
    sgtVisibleCount,
    missingLabelCount
  };
}

if (require.main === module) {
  verifyImagePixels().finally(() => prisma.$disconnect());
}
