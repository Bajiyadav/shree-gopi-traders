/**
 * SGT BRAND MARK + OPTIMISATION FOR THE PRODUCT CATALOGUE
 *
 *   node scripts/imaging/brand-images.mjs            # dry run
 *   node scripts/imaging/brand-images.mjs --apply    # write the images
 *
 * Stamps a small "SGT" mark on every catalogue image and compresses the
 * photographs. Product pixels are never redrawn — the mark is composited over
 * the existing image, and the illustrations get the same mark injected into
 * their SVG.
 *
 * PLACEMENT is bottom-left, chosen by measurement rather than taste. Each
 * corner of all 78 photographs was sampled over exactly the box the mark
 * occupies (scripts/imaging/corners.mjs): bottom-left was the brightest at
 * 243.7 and the only corner, with top-left, that was clean in every image.
 * Both right-hand corners carry product or shadow in 12 of 78.
 *
 * IDEMPOTENT via a manifest of post-branding hashes. Re-running skips files
 * that already carry the mark, so the stamp can never be applied twice. Replace
 * a source image and its hash stops matching, so it gets branded on the next run.
 *
 * The mark carries no claim — it is the seller's initials, nothing more. No
 * manufacturer branding, no "genuine"/"original"/price claims.
 */
import sharp from "sharp";
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const ROOT = "public/products";
const MANIFEST = "scripts/imaging/branded-manifest.json";

// ── Mark geometry, as fractions of the image ──────────────────
const MARGIN = 0.038;   // distance from the two edges
const CAP_H = 0.042;    // cap height of the lettering
const OPACITY = 0.62;   // present, not shouting
const INK = "#334155";  // slate — neutral on the light backdrops in use

/** The mark as SVG, sized for an image of the given dimensions. */
function markSvg(W, H) {
  const size = Math.round(H * CAP_H);
  const x = Math.round(W * MARGIN);
  const y = Math.round(H * (1 - MARGIN));
  // Letter-spaced, semibold, with a hairline rule under it so it reads as a
  // mark rather than as stray text left on the photograph.
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <g opacity="${OPACITY}">
    <text x="${x}" y="${y}" fill="${INK}"
          font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
          font-size="${size}" font-weight="600" letter-spacing="${size * 0.14}">SGT</text>
    <rect x="${x}" y="${y + Math.round(size * 0.26)}" width="${Math.round(size * 2.35)}"
          height="${Math.max(1, Math.round(size * 0.055))}" fill="${INK}"/>
  </g>
</svg>`);
}

/** The same mark expressed for injection into an existing SVG's coordinates. */
function markForSvg(W, H) {
  const size = H * CAP_H;
  const x = W * MARGIN;
  const y = H * (1 - MARGIN);
  return `<g id="sgt-mark" opacity="${OPACITY}">` +
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${INK}" ` +
    `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" ` +
    `font-size="${size.toFixed(1)}" font-weight="600" letter-spacing="${(size * 0.14).toFixed(2)}">SGT</text>` +
    `<rect x="${x.toFixed(1)}" y="${(y + size * 0.26).toFixed(1)}" width="${(size * 2.35).toFixed(1)}" ` +
    `height="${Math.max(1, size * 0.055).toFixed(1)}" fill="${INK}"/></g>`;
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

// ── Collect the catalogue ─────────────────────────────────────
const files = [];
for (const cat of readdirSync(ROOT)) {
  const dir = join(ROOT, cat);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) {
    if (/\.(png|svg)$/i.test(f)) files.push(join(dir, f));
  }
}
files.sort();

let branded = 0, skipped = 0, failed = 0;
let bytesBefore = 0, bytesAfter = 0;
const problems = [];

for (const file of files) {
  const current = readFileSync(file);
  bytesBefore += current.length;

  // Already carries the mark from a previous run.
  if (manifest[file] === sha(current)) {
    skipped++;
    bytesAfter += current.length;
    continue;
  }

  try {
    let out;

    if (file.endsWith(".svg")) {
      const xml = current.toString("utf8");
      if (xml.includes('id="sgt-mark"')) { skipped++; bytesAfter += current.length; continue; }
      const vb = xml.match(/viewBox="([\d.\-\s]+)"/);
      const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 400, 400];
      out = Buffer.from(xml.replace(/<\/svg>\s*$/, `${markForSvg(vw, vh)}</svg>`), "utf8");
    } else {
      const meta = await sharp(file).metadata();
      const W = meta.width, H = meta.height;
      out = await sharp(file)
        .composite([{ input: markSvg(W, H), top: 0, left: 0 }])
        // Photographs of products on a plain backdrop compress well without
        // visible loss. 1024px is kept — the detail view uses it.
        .png({ quality: 82, compressionLevel: 9, palette: true })
        .toBuffer();
    }

    if (!out || out.length === 0) throw new Error("empty output");
    if (APPLY) {
      writeFileSync(file, out);
      manifest[file] = sha(out);
    }
    bytesAfter += out.length;
    branded++;
  } catch (err) {
    failed++;
    problems.push(`${file}: ${err.message}`);
    bytesAfter += current.length;
  }
}

const mb = (n) => (n / 1048576).toFixed(1) + " MB";
console.log(`
  Files found     : ${files.length}
  Branded         : ${branded}
  Already marked  : ${skipped}
  Failed          : ${failed}
  Size            : ${mb(bytesBefore)} → ${mb(bytesAfter)}  (${bytesBefore ? Math.round((1 - bytesAfter / bytesBefore) * 100) : 0}% smaller)
  Placement       : bottom-left, ${(MARGIN * 100).toFixed(1)}% margin, ${(CAP_H * 100).toFixed(1)}% cap height, ${OPACITY} opacity`);

if (problems.length) {
  console.log(`\n  Problems:`);
  problems.slice(0, 10).forEach((p) => console.log(`    ${p}`));
}

if (APPLY) {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`\n  Wrote ${branded} file(s); manifest updated.\n`);
} else {
  console.log(`\n  DRY RUN — nothing written. Re-run with --apply.\n`);
}
