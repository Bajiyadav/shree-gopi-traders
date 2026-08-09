/**
 * Uploads local image files to Cloudinary, then points products at them.
 *
 *   npm run images:cloudinary -- ./downloads            # dry run — shows the plan
 *   npm run images:cloudinary -- ./downloads --apply    # upload, then write the URLs
 *
 * This is the missing middle of the workflow. `images:urls` assumes you already
 * have Cloudinary URLs; this produces them. You supply a folder of images you
 * have the right to use, and it uploads each one and records the resulting
 * secure URL against the matching product.
 *
 * FILE NAMING — the basename is the mapping key, resolved most specific first:
 *
 *   SGT-HC-001.jpg          → the product with that SKU
 *   professional-shampoo.jpg → the product with that slug
 *   professional-shampoo-2.jpg → gallery slot 2 of that product
 *   jar.jpg                 → every product packaged as a jar
 *   hair-care.jpg           → every product in that category
 *
 * Slots you do not supply keep whatever the product already has.
 *
 * CREDENTIALS — from the environment, never from a flag or the repo:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *
 * The secret signs the upload request server-side and is never sent to the
 * browser; it has no NEXT_PUBLIC_ prefix, so Next cannot inline it into a
 * client bundle even by accident.
 *
 * Only Product.images is written. Prices, SKUs, stock, variants, orders,
 * customers and analytics are not touched, and nothing is reseeded.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename, extname } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildProductIndex, resolveKey, optimise, mergeSlots, MATCH_RANK, slugify,
} from "./lib/product-index.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DIR = args.find((a) => !a.startsWith("--"));

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "shree-gopi-traders/products";

const EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
/** A product card renders ~400px wide and the detail view ~800px. Below this
 *  the image is a thumbnail, not product photography — most often a search
 *  result copied by mistake rather than a real download. */
const MIN_EDGE = 600;

if (!DIR || !existsSync(DIR) || !statSync(DIR).isDirectory()) {
  console.error("Usage: npm run images:cloudinary -- <folder> [--apply]");
  if (DIR) console.error(`Not a folder: ${DIR}`);
  process.exit(1);
}

// ── Image dimensions, read from the file header ───────────────
// Avoids shelling out to sips/ImageMagick, so the size guard works anywhere.
function dimensions(buf) {
  // PNG
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // WebP (RIFF....WEBP)
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
    }
  }
  // JPEG — walk the segment chain to a start-of-frame marker.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null; // unknown format — let Cloudinary decide
}

// ── Signed upload ─────────────────────────────────────────────
/**
 * Cloudinary signs with sha1 over the alphabetically sorted parameters plus
 * the API secret. `file`, `api_key` and `resource_type` are excluded by spec.
 */
function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function upload(buf, filename, publicId) {
  const timestamp = Math.floor(Number(process.env.SOURCE_DATE_EPOCH || Date.now() / 1000));
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
  if (!res.ok) {
    // Cloudinary echoes the message but never the secret.
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return body.secure_url;
}

// ── Build the plan ────────────────────────────────────────────
const products = buildProductIndex();
const files = readdirSync(DIR)
  .filter((f) => EXTS.has(extname(f).toLowerCase()))
  .sort();

const plan = new Map(); // product slug -> { how, slots: { n: { file, publicId } } }
const skipped = [];
const jobs = new Map(); // file -> { path, publicId, buf }

for (const file of files) {
  const path = join(DIR, file);
  const key = basename(file, extname(file));
  const match = resolveKey(key, products);
  if (!match) { skipped.push(`${file}  (matches no product, SKU, packaging type or category)`); continue; }

  const buf = readFileSync(path);
  const dim = dimensions(buf);
  if (dim && Math.max(dim.w, dim.h) < MIN_EDGE) {
    skipped.push(`${file}  (${dim.w}×${dim.h} — too small; needs ${MIN_EDGE}px on the long edge)`);
    continue;
  }

  const publicId = slugify(key);
  jobs.set(file, { path, publicId, buf, dim });

  for (const t of match.targets) {
    const entry = plan.get(t.slug) ?? { how: match.how, slots: {} };
    const existing = entry.slots[match.slot];
    if (!existing || MATCH_RANK[match.how] < MATCH_RANK[existing.how]) {
      entry.slots[match.slot] = { file, how: match.how };
    }
    plan.set(t.slug, entry);
  }
}

const prisma = new PrismaClient();
const existing = await prisma.product.findMany({ select: { slug: true, name: true, images: true } });
const bySlug = new Map(existing.map((p) => [p.slug, p]));

console.log(`\nFolder       : ${DIR}`);
console.log(`Images found : ${files.length}  (${jobs.size} usable)`);
console.log(`Products hit : ${plan.size} of ${existing.length}`);
console.log(`Cloudinary   : ${CLOUD ? `cloud "${CLOUD}", folder "${FOLDER}"` : "NOT CONFIGURED"}`);
console.log(`Database     : ${(process.env.DATABASE_URL || "").includes("neon.tech") ? "NEON (production)" : "local"}`);

if (skipped.length) {
  console.log(`\nSkipped (${skipped.length}):`);
  skipped.slice(0, 12).forEach((s) => console.log(`  ${s}`));
  if (skipped.length > 12) console.log(`  … and ${skipped.length - 12} more`);
}

console.log(`\nWould upload ${jobs.size} file(s) and update ${plan.size} product(s):`);
[...jobs.entries()].slice(0, 12).forEach(([f, j]) =>
  console.log(`  ${f}  ${j.dim ? `${j.dim.w}×${j.dim.h}` : "?"}  → ${FOLDER}/${j.publicId}`)
);
if (jobs.size > 12) console.log(`  … and ${jobs.size - 12} more`);

if (!APPLY) {
  console.log(`\nDRY RUN — nothing was uploaded and the database was not modified.`);
  console.log(`Re-run with --apply once the plan looks right.\n`);
  await prisma.$disconnect();
  process.exit(0);
}

if (!CLOUD || !KEY || !SECRET) {
  console.error(`\nMissing Cloudinary credentials. Set these in .env.local:`);
  console.error(`  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET`);
  console.error(`Find them under Settings → API Keys in the Cloudinary console.\n`);
  await prisma.$disconnect();
  process.exit(1);
}

// ── Upload ────────────────────────────────────────────────────
const urls = new Map();
let n = 0;
for (const [file, job] of jobs) {
  n++;
  try {
    const url = await upload(job.buf, file, job.publicId);
    urls.set(file, optimise(url));
    console.log(`  [${n}/${jobs.size}] ${file} → uploaded`);
  } catch (err) {
    console.error(`  [${n}/${jobs.size}] ${file} → FAILED: ${err.message}`);
  }
}

// ── Write ─────────────────────────────────────────────────────
let written = 0;
for (const [slug, entry] of plan) {
  const product = bySlug.get(slug);
  if (!product) continue;

  const slots = {};
  for (const [slot, { file }] of Object.entries(entry.slots)) {
    const url = urls.get(file);
    if (url) slots[slot] = url;
  }
  if (!Object.keys(slots).length) continue;

  const next = mergeSlots(product.images, slots);
  if (JSON.stringify(next) === JSON.stringify(product.images)) continue;

  // Only Product.images is touched.
  await prisma.product.update({ where: { slug }, data: { images: next } });
  written++;
}

console.log(`\nUploaded ${urls.size} image(s); updated ${written} product(s).`);
console.log("Only Product.images changed — no prices, stock, variants or orders were touched.");
console.log("Next: npm run build && vercel deploy --prod\n");
await prisma.$disconnect();
