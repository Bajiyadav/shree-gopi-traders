/**
 * POINT EVERY PRODUCT AT ITS OWN IMAGES
 *
 *   npm run images:sync            # dry run — reports what is wrong
 *   npm run images:sync -- --apply # write Product.images
 *
 * Each product's gallery is derived from its own category slug and its own
 * name, so an image can never end up on the wrong product:
 *
 *   /products/<category-slug>/<product-slug>.png     ← preferred
 *   /products/<category-slug>/<product-slug>.svg     ← fallback
 *   …-2 and …-3 for the second and third gallery slots
 *
 * A photograph wins over the generated illustration whenever one exists on
 * disk, per slot. A product with a photograph for the main shot and drawings
 * for the rest gets exactly that mixture.
 *
 * Every path is checked against public/ before it is written. A gallery entry
 * pointing at a file that does not exist renders as a broken image, and the
 * only place that is visible is the storefront.
 *
 * Only Product.images is written. Prices, stock, tiers and orders are read-only
 * here, and remote Cloudinary URLs already set on a product are left alone —
 * this script only ever manages local files.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const PUBLIC = join(process.cwd(), "public");

const SLOTS = [1, 2, 3] as const;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Web path → file on disk. */
const onDisk = (webPath: string) => existsSync(join(PUBLIC, webPath.replace(/^\//, "")));

async function main() {
  const dbName = (process.env.DATABASE_URL ?? "").match(/\/([^/?]+)(\?|$)/)?.[1] ?? "local";

  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, slug: true, images: true,
      category: { select: { slug: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  type Row = {
    name: string; category: string;
    from: string[]; to: string[];
    photos: number; drawings: number; missing: string[];
  };
  const changes: Row[] = [];
  const problems: string[] = [];
  let photoProducts = 0, drawingProducts = 0, remoteProducts = 0;

  for (const p of products) {
    // Never touch a product already pointing at a CDN — that was set deliberately.
    if (p.images.some((i) => /^https?:\/\//.test(i))) {
      remoteProducts++;
      continue;
    }

    const base = `/products/${p.category.slug}/${slugify(p.name)}`;
    const next: string[] = [];
    let photos = 0, drawings = 0;
    const missing: string[] = [];

    for (const slot of SLOTS) {
      const suffix = slot === 1 ? "" : `-${slot}`;
      const png = `${base}${suffix}.png`;
      const svg = `${base}${suffix}.svg`;
      if (onDisk(png)) { next.push(png); photos++; }
      else if (onDisk(svg)) { next.push(svg); drawings++; }
      else if (slot === 1) missing.push(`${base}.png or .svg`);
    }

    if (!next.length) {
      problems.push(`${p.name} (${p.category.name}) — no image file of either kind on disk`);
      continue;
    }
    if (photos > 0) photoProducts++; else drawingProducts++;

    // Anything the product currently points at that is not on disk is a broken
    // image today, worth reporting even when the rebuild happens to fix it.
    for (const cur of p.images) if (!onDisk(cur)) missing.push(`currently set: ${cur}`);

    if (JSON.stringify(next) !== JSON.stringify(p.images)) {
      changes.push({
        name: p.name, category: p.category.name,
        from: p.images, to: next, photos, drawings, missing,
      });
    } else if (missing.length) {
      problems.push(`${p.name} — ${missing.join(", ")}`);
    }
  }

  console.log(`\n  Database        : ${dbName}`);
  console.log(`  Products        : ${products.length}`);
  console.log(`  With photographs: ${photoProducts}`);
  console.log(`  Illustrated     : ${drawingProducts}`);
  if (remoteProducts) console.log(`  On a CDN (skipped): ${remoteProducts}`);
  console.log(`  Needing a change: ${changes.length}`);

  if (problems.length) {
    console.log(`\n  Problems (${problems.length}):`);
    problems.slice(0, 10).forEach((p) => console.log(`    ${p}`));
    if (problems.length > 10) console.log(`    … and ${problems.length - 10} more`);
  }

  const upgrades = changes.filter((c) => c.photos > 0);
  if (upgrades.length) {
    console.log(`\n  Gaining a photograph (${upgrades.length}):`);
    upgrades.slice(0, 12).forEach((c) =>
      console.log(`    ${c.name.slice(0, 38).padEnd(40)}${c.photos} photo, ${c.drawings} drawn`)
    );
    if (upgrades.length > 12) console.log(`    … and ${upgrades.length - 12} more`);
  }

  const repairs = changes.filter((c) => c.photos === 0);
  if (repairs.length) {
    console.log(`\n  Corrected paths (${repairs.length}):`);
    repairs.slice(0, 6).forEach((c) =>
      console.log(`    ${c.name.slice(0, 34).padEnd(36)}${c.from[0] ?? "(none)"} → ${c.to[0]}`)
    );
  }

  if (!APPLY) {
    console.log(`\n  DRY RUN — nothing written. Re-run with --apply.\n`);
    await prisma.$disconnect();
    return;
  }

  for (const c of changes) {
    const product = products.find((p) => p.name === c.name)!;
    await prisma.product.update({ where: { id: product.id }, data: { images: c.to } });
  }

  console.log(`\n  Updated ${changes.length} product(s).`);
  console.log(`  Only Product.images changed. Every path was checked to exist first.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
