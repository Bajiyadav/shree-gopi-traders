/**
 * Produces the naming sheet for real product photography.
 *
 * The upload pipeline (scripts/cloudinary-upload.mjs) matches a file to a
 * product by its BASENAME, so the only thing standing between a real photo and
 * the live site is naming the file correctly. This writes that list: one row
 * per active product, with the exact three filenames to use.
 *
 * Drop the renamed photos into one folder and run:
 *   npm run images:cloudinary -- ./that-folder            # dry run
 *   npm run images:cloudinary -- ./that-folder --apply    # upload + go live
 *
 * Read-only: this script only reads the catalogue and writes a CSV next to
 * itself. It never touches the database, Cloudinary, or any image.
 *
 * Run with: npx tsx scripts/photo-shopping-list.ts [--all]
 *   default : active products still on AI-generated imagery
 *   --all   : every active product
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const ALL = process.argv.includes("--all");
const OUT = path.join(process.cwd(), "scripts", "photo-shopping-list.csv");

/** An image we generated rather than photographed. */
const isGenerated = (url: string) =>
  /\/products\/v[0-9]+\//.test(url) || url.startsWith("/");

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { sku: true, slug: true, name: true, brand: true, images: true, category: { select: { name: true } } },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });

  const rows = products.filter((p) => ALL || p.images.every(isGenerated));

  const csv = [
    "brand,product,sku,category,file_1_front,file_2_angle,file_3_detail",
    ...rows.map((p) => {
      const q = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
      return [
        q(p.brand ?? ""),
        q(p.name),
        q(p.sku),
        q(p.category.name),
        q(`${p.sku}.jpg`),
        q(`${p.sku}-2.jpg`),
        q(`${p.sku}-3.jpg`),
      ].join(",");
    }),
  ].join("\n");

  fs.writeFileSync(OUT, csv);

  const byBrand = new Map<string, number>();
  rows.forEach((p) => byBrand.set(p.brand ?? "(no brand)", (byBrand.get(p.brand ?? "(no brand)") ?? 0) + 1));

  console.log(`Active products needing real photography : ${rows.length} of ${products.length}`);
  console.log(`Photos required (3 views each)           : ${rows.length * 3}`);
  console.log(`\nNaming sheet written: ${path.relative(process.cwd(), OUT)}`);
  console.log(`\nTop brands to chase for official imagery:`);
  [...byBrand.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([b, n]) => console.log(`    ${b.padEnd(28)} ${n} product(s) → ${n * 3} photos`));
  console.log(`\nName each file for its SKU, then:`);
  console.log(`    npm run images:cloudinary -- ./your-folder           # dry run`);
  console.log(`    npm run images:cloudinary -- ./your-folder --apply   # live immediately\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
