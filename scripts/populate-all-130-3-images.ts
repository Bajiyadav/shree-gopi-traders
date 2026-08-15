import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();

function parseTableImages() {
  const content = fs.readFileSync("product_images_table.md", "utf-8");
  const lines = content.split("\n");

  const map = new Map<string, string[]>();

  const extractUrl = (raw: string) => {
    if (!raw) return null;
    const m = raw.match(/\((https?:\/\/[^)]+)\)/);
    if (m) return m[1];
    if (raw.startsWith("http")) return raw;
    return null;
  };

  for (const line of lines) {
    if (line.startsWith("| **") && line.includes("| 📸 Studio Photo")) {
      const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
      const name = parts[0].replace(/\*\*/g, "").trim().toLowerCase();

      const img1 = extractUrl(parts[2]);
      const img2 = extractUrl(parts[3]);
      const img3 = extractUrl(parts[4]);

      const imgs = [img1, img2, img3].filter((u): u is string => Boolean(u));
      if (imgs.length > 0) {
        map.set(name, imgs);
      }
    }
  }

  return map;
}

async function main() {
  const tableMap = parseTableImages();
  console.log(`Parsed ${tableMap.size} product 3-image sets from product_images_table.md`);

  const products = await prisma.product.findMany({
    select: { id: true, name: true, images: true },
  });

  console.log(`Found ${products.length} products in DB.`);

  const updates: { id: string; images: string[] }[] = [];

  for (const p of products) {
    const nameLower = p.name.trim().toLowerCase();
    const tableImgs = tableMap.get(nameLower);

    let finalImages = [...p.images];

    if (tableImgs && tableImgs.length > 0) {
      const cleanUrls = tableImgs.map((u) => {
        if (u.includes("shree-gopi-traders.vercel.app")) {
          return u.replace("https://shree-gopi-traders.vercel.app", "");
        }
        return u;
      });
      finalImages = cleanUrls;
    } else if (finalImages.length === 1) {
      const primary = finalImages[0];
      if (primary.startsWith("https://res.cloudinary.com/")) {
        const match = primary.match(/^(https:\/\/res\.cloudinary\.com\/.*\/[^/]+)(\.[a-z]+)$/i);
        if (match && !match[1].endsWith("-2") && !match[1].endsWith("-3")) {
          finalImages = [
            primary,
            `${match[1]}-2${match[2]}`,
            `${match[1]}-3${match[2]}`,
          ];
        }
      } else if (primary.startsWith("/products/")) {
        const match = primary.match(/^(\/products\/[^.]*)(\.[a-z]+)$/i);
        if (match && !match[1].endsWith("-2") && !match[1].endsWith("-3")) {
          finalImages = [
            primary,
            `${match[1]}-2${match[2]}`,
            `${match[1]}-3${match[2]}`,
          ];
        }
      } else if (primary.startsWith("/images/products/")) {
        const match = primary.match(/^(\/images\/products\/[^.]*)(\.[a-z]+)$/i);
        if (match && !match[1].endsWith("-2") && !match[1].endsWith("-3")) {
          finalImages = [
            primary,
            `${match[1]}-2${match[2]}`,
            `${match[1]}-3${match[2]}`,
          ];
        }
      }
    }

    if (JSON.stringify(finalImages) !== JSON.stringify(p.images)) {
      updates.push({ id: p.id, images: finalImages });
    }
  }

  console.log(`Preparing to update ${updates.length} products...`);

  // Execute in small batches
  const batchSize = 25;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((u) =>
        prisma.product.update({
          where: { id: u.id },
          data: { images: u.images },
        })
      )
    );
    console.log(`Updated batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(updates.length / batchSize)}`);
  }

  // Distribution
  const allProducts = await prisma.product.findMany({ select: { images: true } });
  let with1 = 0, with2 = 0, with3 = 0, with0 = 0;
  for (const p of allProducts) {
    if (p.images.length === 0) with0++;
    else if (p.images.length === 1) with1++;
    else if (p.images.length === 2) with2++;
    else if (p.images.length >= 3) with3++;
  }

  console.log("\n=== FINAL 3-IMAGE GALLERY AUDIT ===");
  console.log({
    totalProducts: allProducts.length,
    with3Images: with3,
    with2Images: with2,
    with1Image: with1,
    with0Images: with0,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
