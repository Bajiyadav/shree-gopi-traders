/**
 * Updates all product image paths in the DB from .svg → .png
 * (where a .png file exists alongside the .svg).
 *
 * Run with: npx tsx scripts/update-image-paths.ts
 */
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const PUBLIC_DIR = join(process.cwd(), "public");

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, images: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const newImages = product.images.map((img: string) => {
      if (!img.endsWith(".svg")) return img;
      const pngPath = img.replace(".svg", ".png");
      const fsPath = join(PUBLIC_DIR, pngPath);
      if (existsSync(fsPath)) return pngPath;
      return img; // keep .svg if .png doesn't exist yet
    });

    const changed = newImages.some((img: string, i: number) => img !== product.images[i]);
    if (changed) {
      await prisma.product.update({
        where: { id: product.id },
        data: { images: newImages },
      });
      console.log(`✓ ${product.slug}: ${product.images.join(", ")} → ${newImages.join(", ")}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} unchanged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
