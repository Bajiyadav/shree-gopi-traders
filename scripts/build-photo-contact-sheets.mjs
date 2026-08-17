/**
 * Builds contact sheets from the triage CSV so the REVIEW candidates can be
 * eyeballed a dozen at a time instead of one file per look.
 *
 * Each cell is one image, numbered top-left. The numbering matches the index
 * printed to stdout, so a mismatch can be reported as "sheet 3, cell 7".
 *
 * Read-only with respect to the catalogue: reads public/ and writes PNGs into
 * the scratch output folder. No database access, no uploads.
 *
 * Usage: node scripts/build-photo-contact-sheets.mjs <outDir>
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = process.argv[2] || "/tmp/contact-sheets";
const CSV = path.join(process.cwd(), "scripts", "orphaned-photo-triage.csv");

const COLS = 4;
const ROWS = 3;
const CELL = 320;
const PER_SHEET = COLS * ROWS;

/** Minimal CSV row splitter that respects double-quoted fields. */
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

const lines = fs.readFileSync(CSV, "utf8").trim().split("\n").slice(1);
const rows = lines
  .map(splitCsv)
  .filter((c) => c[0] === "REVIEW")
  .map((c) => ({ file: c[1], slot: Number(c[4]), sku: c[5], name: c[6] }));

fs.mkdirSync(OUT_DIR, { recursive: true });

const sheets = Math.ceil(rows.length / PER_SHEET);
console.log(`REVIEW candidates: ${rows.length}  →  ${sheets} sheet(s) of ${PER_SHEET}\n`);

for (let s = 0; s < sheets; s++) {
  const slice = rows.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
  const composites = [];

  for (let i = 0; i < slice.length; i++) {
    const abs = path.join(process.cwd(), "public", slice[i].file.replace(/^\//, ""));
    if (!fs.existsSync(abs)) continue;
    const buf = await sharp(abs)
      .resize(CELL - 8, CELL - 8, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    composites.push({
      input: buf,
      left: (i % COLS) * CELL + 4,
      top: Math.floor(i / COLS) * CELL + 4,
    });
    // Index tag, drawn as a small SVG badge in the cell's top-left corner.
    const tag = Buffer.from(
      `<svg width="46" height="26"><rect width="46" height="26" rx="5" fill="#0f172a"/>` +
      `<text x="23" y="18" font-family="Helvetica" font-size="15" font-weight="bold" fill="#fff" text-anchor="middle">${i + 1}</text></svg>`
    );
    composites.push({ input: tag, left: (i % COLS) * CELL + 8, top: Math.floor(i / COLS) * CELL + 8 });
  }

  const file = path.join(OUT_DIR, `sheet-${String(s + 1).padStart(2, "0")}.png`);
  await sharp({
    create: { width: COLS * CELL, height: ROWS * CELL, channels: 3, background: { r: 226, g: 232, b: 240 } },
  })
    .composite(composites)
    .png()
    .toFile(file);

  console.log(`SHEET ${s + 1}  ${file}`);
  slice.forEach((r, i) => console.log(`   ${String(i + 1).padStart(2)}. [slot ${r.slot}] ${r.sku.padEnd(30)} ${r.name}`));
  console.log("");
}
