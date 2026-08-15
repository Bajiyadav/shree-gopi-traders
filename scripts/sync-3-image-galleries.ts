import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true }
  });

  let updatedCount = 0;

  for (const p of products) {
    if (p.images.length === 0) continue;

    const currentImages = [...p.images];
    const primaryImg = currentImages[0];

    // If primary image is local or Cloudinary with standard angle patterns, check for -2, -3 or angles
    if (primaryImg.startsWith("https://res.cloudinary.com/")) {
      // Check if it's in a standard format ending in .png / .jpg
      const match = primaryImg.match(/^(https:\/\/res\.cloudinary\.com\/.*\/[^/]+)(\.[a-z]+)$/i);
      if (match) {
        const base = match[1];
        const ext = match[2];
        const angle2 = `${base}-2${ext}`;
        const angle3 = `${base}-3${ext}`;

        // If currentImages only has 1, add angle 2 and angle 3 if they don't already exist
        if (currentImages.length === 1 && !base.endsWith("-2") && !base.endsWith("-3")) {
          currentImages.push(angle2, angle3);
        }
      }
    } else if (primaryImg.startsWith("/products/")) {
      const match = primaryImg.match(/^(\/products\/[^.]*)(\.[a-z]+)$/i);
      if (match) {
        const base = match[1];
        const ext = match[2];
        const angle2 = `${base}-2${ext}`;
        const angle3 = `${base}-3${ext}`;

        const localAngle2 = path.join(process.cwd(), "public", angle2);
        const localAngle3 = path.join(process.cwd(), "public", angle3);

        const newImages = [primaryImg];
        if (fs.existsSync(localAngle2)) newImages.push(angle2);
        if (fs.existsSync(localAngle3)) newImages.push(angle3);

        if (newImages.length > currentImages.length) {
          currentImages.splice(0, currentImages.length, ...newImages);
        }
      }
    }

    if (currentImages.length !== p.images.length) {
      await prisma.product.update({
        where: { id: p.id },
        data: { images: currentImages }
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} products with multi-angle gallery images.`);

  // Final distribution check
  const afterProducts = await prisma.product.findMany();
  let with1 = 0, with2 = 0, with3 = 0, with0 = 0;
  for (const p of afterProducts) {
    if (p.images.length === 0) with0++;
    else if (p.images.length === 1) with1++;
    else if (p.images.length === 2) with2++;
    else if (p.images.length >= 3) with3++;
  }

  console.log("FINAL GALLERY DISTRIBUTION:", {
    total: afterProducts.length,
    with0Images: with0,
    with1Image: with1,
    with2Images: with2,
    with3Images: with3,
  });

  await prisma.$disconnect();
}

main().catch(console.error);
