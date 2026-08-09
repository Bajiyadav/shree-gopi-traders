/**
 * Imports real product photography into the catalogue.
 *
 *   npm run images:import -- <source-folder>            # dry run, shows the plan
 *   npm run images:import -- <source-folder> --apply    # actually copy
 *
 * Drop your generated/photographed images in a folder, named after either the
 * product slug, the SKU, or the packaging type. The script matches each file to
 * a product, converts it, and writes it to the path the database already points
 * at — so no code or database change is needed afterwards.
 *
 * Matching, most specific first:
 *   1. exact product slug        professional-shampoo.png   → that product
 *   2. product SKU               SGT-HC-001.jpg             → that product
 *   3. packaging type            pump-bottle.png            → every product
 *                                                             using that shape
 *   4. category slug             hair-care.png              → every product in
 *                                                             that category
 *
 * A `-2` / `-3` suffix targets the second and third gallery slots:
 *   professional-shampoo-2.png
 *
 * Conversion to WebP uses `cwebp` or `sips` when available; otherwise the file
 * is copied as-is and the report says so. Nothing is overwritten in a dry run.
 */
import { readdirSync, existsSync, copyFileSync, mkdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { CATALOG } from "../prisma/catalog-data.ts";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const SOURCE = args.find((a) => !a.startsWith("--"));

if (!SOURCE) {
  console.error("Usage: npm run images:import -- <source-folder> [--apply]");
  process.exit(1);
}
if (!existsSync(SOURCE)) {
  console.error(`Source folder not found: ${SOURCE}`);
  process.exit(1);
}

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Same shape routing the generator uses, so "pump-bottle.png" lands on the
// products actually drawn as pump bottles.
const SHAPE_RULES = [
  [/dryer/i, "hair-dryer"], [/straighten|flat.?iron|crimper|curler|curling/i, "flat-iron"],
  [/clipper|trimmer|shaving machine/i, "clipper"], [/scissor|shear/i, "scissors"],
  [/razor|blade/i, "razor"],
  [/chair|bed|station|stool|mirror unit|cabinet|table/i, "chair"],
  [/trolley/i, "trolley"],
  [/steamer|steriliz|sterilis|machine|hot towel|magnifying|high frequency|foot spa|heater/i, "machine"],
  [/uv\/led|uv lamp|led lamp|nail lamp/i, "lamp"],
  [/nail polish|gel polish|top coat|nail glue/i, "polish"],
  [/palette|eyeshadow/i, "palette"], [/lipstick|lip colour|lip color/i, "lipstick"],
  [/towel/i, "towels"],
  [/glove|cap|sheet|strip|tissue|cotton|foil|apron|cape/i, "box"],
  [/brush|comb/i, "brush-set"],
  [/bowl|manicure kit|pedicure kit|cutter|cuticle|file|tips|nail art|drill/i, "tools"],
  [/spray|toner|rose water|disinfect|sanitiz|sanitis|cleaner|after shave/i, "spray-bottle"],
  [/serum|oil|dropper/i, "dropper"],
  [/jar|wax|pomade|mask|spa cream|massage cream|pack|scrub|powder|acrylic|bleach|beans/i, "jar"],
  [/cream|gel|lotion|moisturi|cleanser|concealer|foundation|mascara|eyeliner/i, "tube"],
  [/kit|set|liner/i, "carton"],
];
const shapeFor = (name) => SHAPE_RULES.find(([re]) => re.test(name))?.[1] ?? "pump-bottle";

// ── Build the product index ───────────────────────────────────
const products = [];
for (const [ci, category] of CATALOG.entries()) {
  for (const [pi, product] of category.products.entries()) {
    products.push({
      name: product.name,
      slug: slugify(product.name),
      sku: `SGT-${category.skuCode}-${String(pi + 1).padStart(3, "0")}`,
      categorySlug: category.slug,
      categoryName: category.name,
      shape: shapeFor(product.name),
      dir: `public/products/${category.slug}`,
    });
  }
  void ci;
}

// ── Converter detection ───────────────────────────────────────
function has(cmd) {
  try { execFileSync("which", [cmd], { stdio: "ignore" }); return true; } catch { return false; }
}
const HAS_CWEBP = has("cwebp");
const HAS_SIPS = has("sips");

function convert(src, dest) {
  // Prefer WebP: smaller at equivalent quality, and Next serves it directly.
  if (HAS_CWEBP) {
    execFileSync("cwebp", ["-q", "82", "-resize", "1000", "0", src, "-o", dest], { stdio: "ignore" });
    return "cwebp";
  }
  if (HAS_SIPS) {
    execFileSync("sips", ["-s", "format", "webp", "-Z", "1000", src, "--out", dest], { stdio: "ignore" });
    return "sips";
  }
  copyFileSync(src, dest.replace(/\.webp$/, path.extname(src)));
  return "copied as-is";
}

// ── Match each source file ────────────────────────────────────
const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
const files = readdirSync(SOURCE).filter((f) => IMAGE_RE.test(f));

if (files.length === 0) {
  console.error(`No image files (.jpg/.png/.webp/.avif) found in ${SOURCE}`);
  process.exit(1);
}

const plan = [];
const unmatched = [];

for (const file of files) {
  const base = path.basename(file, path.extname(file));
  const slotMatch = base.match(/-([23])$/);
  const slot = slotMatch ? Number(slotMatch[1]) : 1;
  const key = slugify(slotMatch ? base.slice(0, -2) : base);

  let targets = products.filter((p) => p.slug === key);
  let how = "product slug";

  if (targets.length === 0) {
    targets = products.filter((p) => slugify(p.sku) === key);
    how = "SKU";
  }
  if (targets.length === 0) {
    targets = products.filter((p) => p.shape === key);
    how = "packaging type";
  }
  if (targets.length === 0) {
    targets = products.filter((p) => p.categorySlug === key);
    how = "category";
  }
  if (targets.length === 0) { unmatched.push(file); continue; }

  for (const t of targets) {
    const suffix = slot === 1 ? "" : `-${slot}`;
    plan.push({
      source: path.join(SOURCE, file),
      dest: `${t.dir}/${t.slug}${suffix}.webp`,
      product: t.name,
      how,
      slot,
    });
  }
}

// ── Report ────────────────────────────────────────────────────
const byHow = plan.reduce((acc, p) => ((acc[p.how] = (acc[p.how] ?? 0) + 1), acc), {});
const productsCovered = new Set(plan.filter((p) => p.slot === 1).map((p) => p.product));

console.log(`\nSource      : ${SOURCE}`);
console.log(`Image files : ${files.length}`);
console.log(`Converter   : ${HAS_CWEBP ? "cwebp (WebP)" : HAS_SIPS ? "sips (WebP)" : "none — files copied as-is"}`);
console.log(`\nPlanned writes: ${plan.length}`);
for (const [how, n] of Object.entries(byHow)) console.log(`  matched by ${how.padEnd(15)} ${n}`);
console.log(`\nProducts receiving a main image: ${productsCovered.size} of ${products.length}`);
console.log(`Products left on illustrations : ${products.length - productsCovered.size}`);

if (unmatched.length) {
  console.log(`\nUnmatched files (${unmatched.length}) — rename to a product slug, SKU, packaging type or category:`);
  unmatched.slice(0, 15).forEach((f) => console.log(`  ${f}`));
  if (unmatched.length > 15) console.log(`  … and ${unmatched.length - 15} more`);
}

console.log("\nExamples:");
plan.slice(0, 8).forEach((p) => console.log(`  ${path.basename(p.source)}  →  ${p.dest}`));

if (!APPLY) {
  console.log(`\nDRY RUN — nothing written. Re-run with --apply to copy.\n`);
  process.exit(0);
}

let written = 0, failed = 0;
for (const item of plan) {
  try {
    mkdirSync(path.dirname(item.dest), { recursive: true });
    convert(item.source, item.dest);
    written++;
  } catch (e) {
    failed++;
    console.error(`  failed: ${item.dest} — ${e.message.split("\n")[0]}`);
  }
}

const totalMb = plan.reduce((n, p) => {
  try { return n + statSync(p.dest).size; } catch { return n; }
}, 0) / 1048576;

console.log(`\nWrote ${written} image(s)${failed ? `, ${failed} failed` : ""} — ${totalMb.toFixed(1)} MB total.`);
console.log("The database already points at these paths, so no reseed is needed.");
console.log("Next: npm run build && vercel deploy --prod\n");
