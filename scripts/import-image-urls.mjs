/**
 * Points products at hosted image URLs (Cloudinary).
 *
 *   npm run images:urls -- mapping.csv            # dry run — shows the plan
 *   npm run images:urls -- mapping.csv --apply    # write to the database
 *
 * Unlike `images:import`, which copies files into public/, this writes URLs
 * into Product.images. Nothing is downloaded and nothing is committed — the
 * images stay on the CDN.
 *
 * MAPPING FILE — one per line, `key,url`. Blank lines and # comments ignored.
 *
 *   professional-shampoo,https://res.cloudinary.com/demo/image/upload/v1/shampoo.jpg
 *   professional-shampoo-2,https://res.cloudinary.com/demo/image/upload/v1/shampoo-b.jpg
 *   SGT-HC-002,https://res.cloudinary.com/demo/image/upload/v1/dandruff.jpg
 *   pump-bottle,https://res.cloudinary.com/demo/image/upload/v1/generic-bottle.jpg
 *   hair-care,https://res.cloudinary.com/demo/image/upload/v1/haircare.jpg
 *
 * Key resolution, most specific first: product slug → SKU → packaging type →
 * category slug. A `-2` / `-3` suffix targets that gallery slot; slots you do
 * not supply keep whatever the product already has.
 *
 * Only res.cloudinary.com URLs are accepted. next.config.js allows that single
 * host, so any other domain would render as a broken image — better to reject
 * it here, loudly, than to discover it in production.
 *
 * If you have image FILES rather than URLs, use `images:cloudinary` instead:
 * it uploads them and then does everything this script does.
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  ALLOWED_HOST, buildProductIndex, resolveKey, optimise, mergeSlots, MATCH_RANK,
} from "./lib/product-index.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FILE = args.find((a) => !a.startsWith("--"));

if (!FILE || !existsSync(FILE)) {
  console.error("Usage: npm run images:urls -- <mapping.csv> [--apply]");
  if (FILE) console.error(`File not found: ${FILE}`);
  process.exit(1);
}

const products = buildProductIndex();

// ── Parse the mapping ─────────────────────────────────────────
const lines = readFileSync(FILE, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const plan = new Map(); // slug -> { [slot]: url }
const unmatched = [];
const rejected = [];

for (const line of lines) {
  const idx = line.indexOf(",");
  if (idx === -1) { unmatched.push(`${line}  (no comma — expected "key,url")`); continue; }

  const rawKey = line.slice(0, idx).trim();
  const url = line.slice(idx + 1).trim();

  let host;
  try { host = new URL(url).hostname; } catch { rejected.push(`${rawKey}: not a valid URL`); continue; }
  if (host !== ALLOWED_HOST) {
    rejected.push(`${rawKey}: host "${host}" is not allowed (only ${ALLOWED_HOST})`);
    continue;
  }

  const match = resolveKey(rawKey, products);
  if (!match) { unmatched.push(`${rawKey}  (matches no product, SKU, type or category)`); continue; }
  const { targets, how, slot } = match;

  for (const t of targets) {
    const entry = plan.get(t.slug) ?? { how, slots: {} };
    // A more specific key wins if two rules touch the same product/slot.
    if (!entry.slots[slot] || MATCH_RANK[how] < MATCH_RANK[entry.slots[slot].how]) {
      entry.slots[slot] = { url: optimise(url), how };
    }
    plan.set(t.slug, entry);
  }
}

// ── Report ────────────────────────────────────────────────────
const prisma = new PrismaClient();
const existing = await prisma.product.findMany({ select: { slug: true, name: true, images: true } });
const bySlug = new Map(existing.map((p) => [p.slug, p]));

console.log(`\nMapping file : ${FILE}`);
console.log(`Lines read   : ${lines.length}`);
console.log(`Products hit : ${plan.size} of ${existing.length}`);
console.log(`Database     : ${(process.env.DATABASE_URL || "").includes("neon.tech") ? "NEON (production)" : "local"}`);

if (rejected.length) {
  console.log(`\nRejected (${rejected.length}) — only ${ALLOWED_HOST} URLs are accepted:`);
  rejected.slice(0, 10).forEach((r) => console.log(`  ${r}`));
}
if (unmatched.length) {
  console.log(`\nUnmatched (${unmatched.length}):`);
  unmatched.slice(0, 10).forEach((u) => console.log(`  ${u}`));
}

const writes = [];
for (const [slug, entry] of plan) {
  const product = bySlug.get(slug);
  if (!product) continue;
  // Merge by slot so a main-image-only mapping keeps the existing gallery.
  const slots = Object.fromEntries(
    Object.entries(entry.slots).map(([slot, { url }]) => [slot, url])
  );
  const next = mergeSlots(product.images, slots);
  if (JSON.stringify(next) !== JSON.stringify(product.images)) {
    writes.push({ slug, name: product.name, images: next, how: entry.how });
  }
}

console.log(`\nProducts that would change: ${writes.length}`);
writes.slice(0, 8).forEach((w) =>
  console.log(`  ${w.name}\n    matched by ${w.how}\n    → ${w.images[0]}`)
);
if (writes.length > 8) console.log(`  … and ${writes.length - 8} more`);

if (!APPLY) {
  console.log(`\nDRY RUN — the database was not modified.`);
  console.log(`Re-run with --apply to write ${writes.length} product(s).\n`);
  await prisma.$disconnect();
  process.exit(0);
}

let written = 0;
for (const w of writes) {
  // Only Product.images is touched. Prices, SKUs, stock, variants, orders
  // and every other column are left exactly as they are.
  await prisma.product.update({ where: { slug: w.slug }, data: { images: w.images } });
  written++;
}


console.log(`\nUpdated ${written} product(s).`);
console.log("Only Product.images changed — no prices, stock, variants or orders were touched.");
console.log("Next: npm run build && vercel deploy --prod\n");
await prisma.$disconnect();
