/**
 * Uploads the human-verified real product photographs and assigns them by SKU.
 *
 * WHY THIS EXISTS ALONGSIDE cloudinary-upload.mjs
 * That script resolves a filename to a product through buildProductIndex(),
 * which is built from the STATIC prisma/catalog-data.ts. It therefore cannot
 * see any product added to the database after the original seed — 69 of the
 * 102 verified files "matched no product" for that reason alone, despite the
 * products existing and being active.
 *
 * This script skips filename guessing entirely. It reads
 * scripts/orphaned-photo-triage.csv, which pairs each file with the SKU it
 * belongs to, and assigns straight to that SKU. Those pairings were checked
 * by eye on contact sheets before this ran.
 *
 * SCOPE — writes exactly one column, Product.images, on the SKUs listed.
 * No prices, stock, variants, orders or ratings are touched, and nothing is
 * deleted. Cloudinary uploads are additive.
 *
 * EXCLUSIONS — products whose photographs were found to show the wrong item
 * are listed in EXCLUDED_SKUS and are never uploaded.
 *
 * Usage:
 *   node scripts/upload-verified-photos.mjs           # dry run
 *   node scripts/upload-verified-photos.mjs --apply   # upload + assign
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "shree-gopi-traders/products/real";

/** Verified on contact sheets as showing a DIFFERENT product than the SKU names. */
const EXCLUDED_SKUS = new Set([
  "SGT-FUR-CHARCOAL-GREY", // photographs show a teal chair, not charcoal grey
  "SGT-SC-013",            // shows Dark Spot Brightening Serum, not the SPF 17 day cream
]);

const prisma = new PrismaClient();

function splitCsv(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const sign = (params) =>
  createHash("sha1")
    .update(
      Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + SECRET
    )
    .digest("hex");

/** Delivered through Cloudinary's automatic format/quality pipeline. */
const optimise = (url) => url.replace("/upload/", "/upload/f_auto,q_auto/");

async function upload(buf, filename, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder: FOLDER, public_id: publicId, overwrite: "true", timestamp };
  const form = new FormData();
  form.append("file", new Blob([buf]), filename);
  form.append("api_key", KEY);
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
  form.append("signature", sign(signed));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `HTTP ${res.status}`);
  return body.secure_url;
}

// ── Plan ──────────────────────────────────────────────────────
const rows = readFileSync("scripts/orphaned-photo-triage.csv", "utf8")
  .trim().split("\n").slice(1).map(splitCsv)
  .filter((c) => c[0] === "REVIEW" && !EXCLUDED_SKUS.has(c[5]));

/** sku -> { slot: filePath } */
const bySku = new Map();
for (const c of rows) {
  const [, file, , , slot, sku] = c;
  if (!bySku.has(sku)) bySku.set(sku, {});
  bySku.get(sku)[Number(slot)] = file;
}

const skus = [...bySku.keys()];
const products = await prisma.product.findMany({
  where: { sku: { in: skus } },
  select: { sku: true, name: true, images: true, isActive: true },
});
const productBySku = new Map(products.map((p) => [p.sku, p]));

console.log(APPLY ? "APPLYING\n" : "DRY RUN — pass --apply to upload and write\n");
console.log(`Verified files            : ${rows.length}`);
console.log(`Products to update        : ${skus.length}`);
console.log(`Excluded (wrong product)  : ${[...EXCLUDED_SKUS].join(", ")}`);
console.log(`Cloudinary folder         : ${FOLDER}`);
const missing = skus.filter((s) => !productBySku.has(s));
if (missing.length) console.log(`NOT FOUND in database     : ${missing.join(", ")}`);

if (!APPLY) {
  skus.slice(0, 6).forEach((s) => {
    const p = productBySku.get(s);
    console.log(`  ${s.padEnd(32)} ${Object.keys(bySku.get(s)).length} view(s)  ${p ? p.name.slice(0, 40) : "—"}`);
  });
  console.log(`  … ${Math.max(0, skus.length - 6)} more`);
  await prisma.$disconnect();
  process.exit(0);
}

if (!CLOUD || !KEY || !SECRET) {
  console.error("\nMissing Cloudinary credentials (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).\n");
  await prisma.$disconnect();
  process.exit(1);
}

// ── Upload + assign ───────────────────────────────────────────
let updated = 0;
let uploaded = 0;
for (const sku of skus) {
  const product = productBySku.get(sku);
  if (!product) continue;

  const slots = bySku.get(sku);
  const next = [...product.images];
  for (const slot of [1, 2, 3]) {
    const rel = slots[slot];
    if (!rel) continue;
    const abs = join(process.cwd(), "public", rel.replace(/^\//, ""));
    try {
      const buf = readFileSync(abs);
      const publicId = basename(rel).replace(/\.[^.]+$/, "");
      const url = optimise(await upload(buf, basename(rel), publicId));
      next[slot - 1] = url;
      uploaded++;
    } catch (err) {
      console.error(`  ${sku} slot ${slot} → FAILED: ${err.message}`);
    }
  }

  if (JSON.stringify(next) !== JSON.stringify(product.images)) {
    await prisma.product.update({ where: { sku }, data: { images: next } });
    updated++;
    console.log(`  ${sku.padEnd(32)} ${product.name.slice(0, 44)}`);
  }
}

console.log(`\nUploaded ${uploaded} image(s); updated ${updated} product(s).`);
console.log("Only Product.images changed — no prices, stock, variants or orders touched.");
await prisma.$disconnect();
