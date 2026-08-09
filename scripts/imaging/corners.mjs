import sharp from "sharp";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "public/products";
const pngs = [];
for (const cat of readdirSync(ROOT)) {
  const dir = join(ROOT, cat);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) if (f.endsWith(".png")) pngs.push(join(dir, f));
}

// A brand mark sits in a box about 22% wide and 9% tall. Measure exactly that
// box in each corner: mean brightness (light is good) and standard deviation
// (flat is good — detail there means product or shadow).
const BOX_W = 0.22, BOX_H = 0.09, PAD = 0.035;
const corners = { "top-left": 0, "top-right": 0, "bottom-left": 0, "bottom-right": 0 };
const busy = { "top-left": 0, "top-right": 0, "bottom-left": 0, "bottom-right": 0 };

for (const file of pngs) {
  const img = sharp(file);
  const { width: W, height: H } = await img.metadata();
  const w = Math.round(W * BOX_W), h = Math.round(H * BOX_H);
  const px = Math.round(W * PAD), py = Math.round(H * PAD);
  const regions = {
    "top-left":     { left: px,           top: py },
    "top-right":    { left: W - w - px,   top: py },
    "bottom-left":  { left: px,           top: H - h - py },
    "bottom-right": { left: W - w - px,   top: H - h - py },
  };
  for (const [name, pos] of Object.entries(regions)) {
    // stats() reads the INPUT image and ignores pipeline operations, so the
    // crop has to be materialised into a buffer before measuring it.
    const crop = await sharp(file).extract({ ...pos, width: w, height: h })
      .greyscale().raw().toBuffer();
    const st = await sharp(crop, { raw: { width: w, height: h, channels: 1 } }).stats();
    const { mean, stdev } = st.channels[0];
    corners[name] += mean;
    // Busy = visibly not a flat backdrop.
    if (stdev > 6 || mean < 225) busy[name]++;
  }
}

console.log(`  Measured ${pngs.length} photographs\n`);
console.log(`  ${"corner".padEnd(15)}${"avg brightness".padEnd(17)}images where it is busy`);
for (const [name, sum] of Object.entries(corners)) {
  console.log(`  ${name.padEnd(15)}${(sum / pngs.length).toFixed(1).padEnd(17)}${busy[name]} of ${pngs.length}`);
}
const best = Object.entries(busy).sort((a, b) => a[1] - b[1] || corners[b[0]] - corners[a[0]])[0][0];
console.log(`\n  → safest consistent corner: ${best}`);
