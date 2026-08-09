/**
 * BAKE "SGT ORIGINAL" INTO EVERY CATALOGUE IMAGE
 *
 *   node scripts/imaging/apply-sgt-badge.mjs           # dry run
 *   node scripts/imaging/apply-sgt-badge.mjs --apply   # write
 *
 * The mark goes into the image bytes — composited into the raster for
 * photographs, injected as vector into the SVG for illustrations. Nothing here
 * relies on HTML, CSS, alt text or a filename.
 *
 * Both paths render from scripts/imaging/sgt-badge.mjs, so a photograph and an
 * illustration carry the same mark and the verifier knows exactly what to look
 * for.
 *
 * Idempotent: SVGs are skipped when they already contain the badge id, rasters
 * when the badge region already matches the colour signature. Re-running is a
 * no-op, and a replaced source image is picked up automatically.
 */
import sharp from "sharp";
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { badgeMarkup, badgeBox, BADGE } from "./sgt-badge.mjs";
import { hasBadgePixels } from "./verify-badge.mjs";

const APPLY = process.argv.includes("--apply");
const ROOT = "public/products";
const BADGE_ID = "sgt-brand-tag";

const files = [];
for (const cat of readdirSync(ROOT)) {
  const dir = join(ROOT, cat);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) if (/\.(png|svg)$/i.test(f)) files.push(join(dir, f));
}
files.sort();

let stamped = 0, already = 0, failed = 0;
let before = 0, after = 0;
const problems = [];

for (const file of files) {
  const current = readFileSync(file);
  before += current.length;

  try {
    if (file.endsWith(".svg")) {
      const xml = current.toString("utf8");
      if (xml.includes(`id="${BADGE_ID}"`)) { already++; after += current.length; continue; }
      const vb = xml.match(/viewBox="([\d.\-\s]+)"/);
      const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 400, 400];
      const out = Buffer.from(
        xml.replace(/<\/svg>\s*$/, `${badgeMarkup(vw, vh)}</svg>`),
        "utf8"
      );
      if (APPLY) writeFileSync(file, out);
      after += out.length;
      stamped++;
    } else {
      const meta = await sharp(file).metadata();
      const { width: W, height: H } = meta;
      if (await hasBadgePixels(current, W, H)) { already++; after += current.length; continue; }
      const out = await sharp(file)
        .composite([{ input: Buffer.from(badgeMarkup(W, H, { asDocument: true })), top: 0, left: 0 }])
        // Kept at source resolution; Next.js resizes and re-encodes per request.
        // palette:true would posterise the amber against the navy plate, so the
        // badge is left in full colour and compression comes from the effort dial.
        .png({ compressionLevel: 9, effort: 10 })
        .toBuffer();
      if (!out?.length) throw new Error("empty output");
      if (APPLY) writeFileSync(file, out);
      after += out.length;
      stamped++;
    }
  } catch (err) {
    failed++;
    problems.push(`${file}: ${err.message}`);
    after += current.length;
  }
}

const mb = (n) => (n / 1048576).toFixed(1) + " MB";
console.log(`
  Files            : ${files.length}
  Badge applied    : ${stamped}
  Already carried  : ${already}
  Failed           : ${failed}
  Size             : ${mb(before)} → ${mb(after)}
  Placement        : bottom-left, ${(BADGE.marginFrac * 100).toFixed(1)}% margin, plate ${BADGE.plate} / accent ${BADGE.accent}
  Box on 1024px    : ${JSON.stringify(badgeBox(1024, 1024))}
${problems.length ? "\n  Problems:\n" + problems.slice(0, 8).map((p) => "    " + p).join("\n") : ""}
${APPLY ? "  Written.\n" : "  DRY RUN — re-run with --apply.\n"}`);

process.exitCode = failed > 0 ? 1 : 0;
