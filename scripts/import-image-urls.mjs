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
 */
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { CATALOG } from "../prisma/catalog-data.ts";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FILE = args.find((a) => !a.startsWith("--"));

if (!FILE || !existsSync(FILE)) {
  console.error("Usage: npm run images:urls -- <mapping.csv> [--apply]");
  if (FILE) console.error(`File not found: ${FILE}`);
  process.exit(1);
}

const ALLOWED_HOST = "res.cloudinary.com";

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Mirrors the shape routing used by the image generator.
const SHAPE_RULES = [
  [/dryer/i, "hair-dryer"], [/straighten|flat.?iron|crimper|curler|curling/i, "flat-iron"],
  [/clipper|trimmer|shaving machine/i, "clipper"], [/scissor|shear/i, "scissors"],
  [/razor|blade/i, "razor"],
  [/chair|bed|station|stool|mirror unit|cabinet|table/i, "chair"], [/trolley/i, "trolley"],
  [/steamer|steriliz|sterilis|machine|hot towel|magnifying|high frequency|foot spa|heater/i, "machine"],
  [/uv\/led|uv lamp|led lamp|nail lamp/i, "lamp"],
  [/nail polish|gel polish|top coat|nail glue/i, "polish"],
  [/palette|eyeshadow/i, "palette"], [/lipstick|lip colour|lip color/i, "lipstick"],
  [/towel/i, "towels"], [/glove|cap|sheet|strip|tissue|cotton|foil|apron|cape/i, "box"],
  [/brush|comb/i, "brush-set"],
  [/bowl|manicure kit|pedicure kit|cutter|cuticle|file|tips|nail art|drill/i, "tools"],
  [/spray|toner|rose water|disinfect|sanitiz|sanitis|cleaner|after shave/i, "spray-bottle"],
  [/serum|oil|dropper/i, "dropper"],
  [/jar|wax|pomade|mask|spa cream|massage cream|pack|scrub|powder|acrylic|bleach|beans/i, "jar"],
  [/cream|gel|lotion|moisturi|cleanser|concealer|foundation|mascara|eyeliner/i, "tube"],
  [/kit|set|liner/i, "carton"],
];
const shapeFor = (name) => SHAPE_RULES.find(([re]) => re.test(name))?.[1] ?? "pump-bottle";

/**
 * Cloudinary serves a modern format and sensible quality when asked. Injecting
 * f_auto,q_auto costs nothing and typically halves the bytes; if the URL
 * already carries transformations we leave it alone.
 */
function optimise(url) {
  if (!url.includes("/upload/")) return url;
  if (/\/upload\/[^/]*[fq]_auto/.test(url)) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

// ── Build the product index ───────────────────────────────────
const products = [];
for (const category of CATALOG) {
  for (const [pi, product] of category.products.entries()) {
    products.push({
      name: product.name,
      slug: slugify(product.name),
      sku: `SGT-${category.skuCode}-${String(pi + 1).padStart(3, "0")}`,
      categorySlug: category.slug,
      shape: shapeFor(product.name),
    });
  }
}

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

  const slotMatch = rawKey.match(/-([23])$/);
  const slot = slotMatch ? Number(slotMatch[1]) : 1;
  const key = slugify(slotMatch ? rawKey.slice(0, -2) : rawKey);

  let targets = products.filter((p) => p.slug === key);
  let how = "product slug";
  if (!targets.length) { targets = products.filter((p) => slugify(p.sku) === key); how = "SKU"; }
  if (!targets.length) { targets = products.filter((p) => p.shape === key); how = "packaging type"; }
  if (!targets.length) { targets = products.filter((p) => p.categorySlug === key); how = "category"; }
  if (!targets.length) { unmatched.push(`${rawKey}  (matches no product, SKU, type or category)`); continue; }

  for (const t of targets) {
    const entry = plan.get(t.slug) ?? { how, slots: {} };
    // A more specific key wins if two rules touch the same product/slot.
    const rank = { "product slug": 0, SKU: 1, "packaging type": 2, category: 3 };
    if (!entry.slots[slot] || rank[how] < rank[entry.slots[slot].how]) {
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
  const next = [...product.images];
  for (const [slot, { url }] of Object.entries(entry.slots)) {
    next[Number(slot) - 1] = url;
  }
  const cleaned = next.filter(Boolean);
  if (JSON.stringify(cleaned) !== JSON.stringify(product.images)) {
    writes.push({ slug, name: product.name, images: cleaned, how: entry.how });
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

const remaining = await prisma.product.count({
  where: { NOT: { images: { hasSome: [`https://${ALLOWED_HOST}`] } } },
});
void remaining;

console.log(`\nUpdated ${written} product(s).`);
console.log("Only Product.images changed — no prices, stock, variants or orders were touched.");
console.log("Next: npm run build && vercel deploy --prod\n");
await prisma.$disconnect();
