import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function findCategoryTriplets(catSlug: string) {
  const dir = path.join(process.cwd(), "public/products", catSlug);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const baseNames = new Set<string>();

  for (const f of files) {
    if (f.endsWith(".png") && !f.startsWith("_category")) {
      const base = f.replace(/-[23]\.png$/, "").replace(/\.png$/, "");
      baseNames.add(base);
    }
  }

  const triplets: { base: string; images: string[] }[] = [];
  for (const base of baseNames) {
    const img1 = `/products/${catSlug}/${base}.png`;
    const img2 = `/products/${catSlug}/${base}-2.png`;
    const img3 = `/products/${catSlug}/${base}-3.png`;

    const full1 = path.join(process.cwd(), "public", img1);
    const full2 = path.join(process.cwd(), "public", img2);
    const full3 = path.join(process.cwd(), "public", img3);

    if (fs.existsSync(full1) && fs.existsSync(full2) && fs.existsSync(full3)) {
      triplets.push({ base, images: [img1, img2, img3] });
    }
  }
  return triplets;
}

function matchTriplet(name: string, triplets: { base: string; images: string[] }[]) {
  const nameNorm = name.toLowerCase().replace(/[^a-z0-9]/g, " ");
  let bestScore = -1;
  let bestTriplet = triplets[0];

  for (const t of triplets) {
    const baseWords = t.base.split("-");
    let score = 0;
    for (const w of baseWords) {
      if (w.length > 2 && nameNorm.includes(w)) {
        score += w.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTriplet = t;
    }
  }

  return bestTriplet?.images || [];
}

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  const categoryTriplets = new Map<string, { base: string; images: string[] }[]>();
  for (const p of products) {
    const slug = p.category.slug;
    if (!categoryTriplets.has(slug)) {
      categoryTriplets.set(slug, findCategoryTriplets(slug));
    }
  }

  const updates: { id: string; images: string[] }[] = [];

  for (const p of products) {
    let images = [...p.images];
    let needsFix = false;

    // Check if any local image in images[] does not exist on disk
    for (const img of images) {
      if (img.startsWith("/")) {
        const full = path.join(process.cwd(), "public", img);
        if (!fs.existsSync(full)) {
          needsFix = true;
          break;
        }
      }
    }

    if (needsFix || images.length < 3) {
      const triplets = categoryTriplets.get(p.category.slug) || [];
      if (triplets.length > 0) {
        images = matchTriplet(p.name, triplets);
        updates.push({ id: p.id, images });
      }
    }
  }

  console.log(`Fixing ${updates.length} products with verified on-disk triplets...`);

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
  }

  console.log("Fix complete! Running audit again...");

  // Final Audit
  const after = await prisma.product.findMany();
  let broken = 0;
  for (const p of after) {
    for (const img of p.images) {
      if (img.startsWith("/")) {
        const full = path.join(process.cwd(), "public", img);
        if (!fs.existsSync(full)) {
          broken++;
        }
      }
    }
  }

  console.log(`Total Products: ${after.length}`);
  console.log(`Products with exactly 3 images: ${after.filter((p) => p.images.length === 3).length}`);
  console.log(`Broken local image paths: ${broken}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
