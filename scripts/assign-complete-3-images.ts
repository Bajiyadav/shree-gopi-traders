import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// Helper to find category triplets in public/products/[categorySlug]/
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

// Find best matching triplet based on keywords in product name
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

  console.log(`Processing ${products.length} products...`);

  // Cache triplets for each category
  const categoryTriplets = new Map<string, { base: string; images: string[] }[]>();
  for (const p of products) {
    const slug = p.category.slug;
    if (!categoryTriplets.has(slug)) {
      categoryTriplets.set(slug, findCategoryTriplets(slug));
    }
  }

  const updates: { id: string; images: string[] }[] = [];

  for (const p of products) {
    if (p.images.length === 3) continue;

    let targetImages: string[] = [];

    if (p.images.length === 1 || p.images.length === 2) {
      const primary = p.images[0];
      if (primary.startsWith("https://res.cloudinary.com/")) {
        const match = primary.match(/^(https:\/\/res\.cloudinary\.com\/.*\/[^/]+)(\.[a-z]+)$/i);
        if (match) {
          const base = match[1].replace(/-[23]$/, "");
          targetImages = [
            `${base}${match[2]}`,
            `${base}-2${match[2]}`,
            `${base}-3${match[2]}`,
          ];
        }
      } else if (primary.startsWith("/images/products/")) {
        const match = primary.match(/^(\/images\/products\/[^.]*)(\.[a-z]+)$/i);
        if (match) {
          const base = match[1].replace(/-[23]$/, "");
          targetImages = [
            `${base}${match[2]}`,
            `${base}-2${match[2]}`,
            `${base}-3${match[2]}`,
          ];
        }
      } else if (primary.startsWith("/products/")) {
        const match = primary.match(/^(\/products\/[^/]+\/[^.]*)(\.[a-z]+)$/i);
        if (match) {
          const base = match[1].replace(/-[23]$/, "");
          targetImages = [
            `${base}${match[2]}`,
            `${base}-2${match[2]}`,
            `${base}-3${match[2]}`,
          ];
        }
      }
    }

    if (targetImages.length < 3) {
      // Find matching triplet in product category
      const triplets = categoryTriplets.get(p.category.slug) || [];
      if (triplets.length > 0) {
        targetImages = matchTriplet(p.name, triplets);
      }
    }

    if (targetImages.length === 3) {
      updates.push({ id: p.id, images: targetImages });
    }
  }

  console.log(`Found ${updates.length} products to complete with 3 images.`);

  // Apply updates in transactions
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

  // Audit
  const allProducts = await prisma.product.findMany({ select: { images: true } });
  let with3 = 0, with2 = 0, with1 = 0, with0 = 0;
  for (const p of allProducts) {
    if (p.images.length === 0) with0++;
    else if (p.images.length === 1) with1++;
    else if (p.images.length === 2) with2++;
    else if (p.images.length >= 3) with3++;
  }

  console.log("\n=== COMPLETED 3-IMAGE GALLERY AUDIT ===");
  console.log({
    totalProducts: allProducts.length,
    with3Images: with3,
    with2Images: with2,
    with1Image: with1,
    with0Images: with0,
    totalImages: with3 * 3 + with2 * 2 + with1,
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
