import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { NOT: { name: { startsWith: "E2E Test" } } },
    select: { name: true, slug: true, images: true, category: { select: { slug: true, name: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const PUBLIC = path.join(process.cwd(), "public");
  const buckets: Record<number, string[]> = {};

  for (const p of products) {
    const count = p.images.length;
    if (!buckets[count]) buckets[count] = [];
    buckets[count].push(`${p.category.name} | ${p.name}`);
  }

  for (const count of Object.keys(buckets).map(Number).sort()) {
    console.log(`\n--- ${count} image(s): ${buckets[count].length} products ---`);
    for (const name of buckets[count]) {
      console.log(`  ${name}`);
    }
  }

  const under3 = products.filter(p => p.images.length < 3);
  console.log(`\n=== NEED MORE SHOTS (< 3 images): ${under3.length} products ===`);
  for (const p of under3) {
    console.log(`  [${p.images.length}] ${p.category.name} | ${p.name} (${p.slug})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
