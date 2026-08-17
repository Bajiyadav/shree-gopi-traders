/**
 * Triage the unused image files in public/ before any of them go near a product.
 *
 * 663 image files sit in public/ and not one is referenced by the database.
 * They are not interchangeable:
 *
 *   SYNTHETIC  flat vector placeholders produced by generate-product-images.mjs
 *              ("PRO ESSENTIAL" on a plain bottle shape). Worthless as product
 *              photography. At 1000x1000 these compress to roughly 90-140KB.
 *
 *   PHOTO      genuine product photography, often composited onto a designed
 *              background. Far more detail, so far larger files.
 *
 * Size at a fixed resolution separates the two reliably, because flat colour
 * fields compress orders of magnitude better than photographic detail.
 *
 * It cannot tell whether a photo shows the RIGHT product. At least one set is
 * cross-wired: loreal-glycolic-bright-day-cream-spf-17*.png shows the Dark Spot
 * Brightening Serum, not the day cream. So this writes a review sheet pairing
 * each candidate with the product it would overwrite, for eyes-on checking
 * before upload.
 *
 * Read-only. Touches no database row, uploads nothing, moves no file.
 *
 * Run with: npx tsx scripts/triage-orphaned-photos.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

/** Below this, a 1000x1000 image is flat art rather than a photograph. */
const PHOTO_MIN_BYTES = 150_000;
const OUT = path.join(process.cwd(), "scripts", "orphaned-photo-triage.csv");

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.(png|jpe?g|webp|avif)$/i.test(e.name) ? [full] : [];
  });
}

/** "slug-2.png" -> { slug, slot 2 }; "slug.png" -> { slug, slot 1 }. */
function parseName(file: string) {
  const base = path.basename(file).replace(/\.(png|jpe?g|webp|avif)$/i, "");
  const m = base.match(/^(.*)-([23])$/);
  return m ? { slug: m[1], slot: Number(m[2]) } : { slug: base, slot: 1 };
}

async function main() {
  const products = await prisma.product.findMany({
    select: { sku: true, slug: true, name: true, isActive: true, images: true },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const referenced = new Set<string>();
  products.forEach((p) => p.images.forEach((i) => i.startsWith("/") && referenced.add(i.split("?")[0])));

  const files = walk("public");
  const rows = files.map((f) => {
    const rel = "/" + path.relative("public", f);
    const size = fs.statSync(f).size;
    const { slug, slot } = parseName(f);
    const product = bySlug.get(slug);
    return {
      file: rel,
      kind: size >= PHOTO_MIN_BYTES ? "PHOTO" : "SYNTHETIC",
      sizeKB: Math.round(size / 1024),
      slot,
      matched: Boolean(product),
      sku: product?.sku ?? "",
      productName: product?.name ?? "",
      active: product?.isActive ?? false,
      inUse: referenced.has(rel),
    };
  });

  const photos = rows.filter((r) => r.kind === "PHOTO");
  const usable = photos.filter((r) => r.matched && r.active);

  console.log(`Image files in public/                 : ${rows.length}`);
  console.log(`  referenced by the database           : ${rows.filter((r) => r.inUse).length}`);
  console.log(`  SYNTHETIC flat placeholders          : ${rows.length - photos.length}`);
  console.log(`  PHOTO candidates                     : ${photos.length}`);
  console.log(`    …matching an ACTIVE product        : ${usable.length}`);
  console.log(`    …matching an inactive product      : ${photos.filter((r) => r.matched && !r.active).length}`);
  console.log(`    …matching no product at all        : ${photos.filter((r) => !r.matched).length}`);

  const byProduct = new Map<string, number>();
  usable.forEach((r) => byProduct.set(r.sku, (byProduct.get(r.sku) ?? 0) + 1));
  console.log(`\n  distinct ACTIVE products covered     : ${byProduct.size}`);
  console.log(`  of those with a full set of 3 views  : ${[...byProduct.values()].filter((n) => n >= 3).length}`);

  const csv = [
    "verdict,file,kind,size_kb,slot,sku,product_name,active",
    ...photos
      .sort((a, b) => a.sku.localeCompare(b.sku) || a.slot - b.slot)
      .map((r) =>
        [
          r.matched && r.active ? "REVIEW" : r.matched ? "INACTIVE_PRODUCT" : "NO_MATCH",
          `"${r.file}"`,
          r.kind,
          r.sizeKB,
          r.slot,
          `"${r.sku}"`,
          `"${r.productName.replace(/"/g, '""')}"`,
          r.active,
        ].join(",")
      ),
  ].join("\n");
  fs.writeFileSync(OUT, csv);
  console.log(`\nReview sheet written: ${path.relative(process.cwd(), OUT)}`);
  console.log(`Open each REVIEW row's file and confirm it shows the named product.`);
  console.log(`Cross-wiring is known to exist — do not upload unchecked.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
