/**
 * IMAGE VERIFICATION — exits non-zero if anything is wrong.
 *
 *   npm run images:verify            # files + database
 *   npm run images:verify -- --live https://shree-gopi-traders.vercel.app
 *
 * Checks, per image the database actually points at:
 *   1. the file exists and is readable
 *   2. it decodes as a real image
 *   3. it belongs to the correct product (own category folder, own slug)
 *   4. "SGT ORIGINAL" is physically present — vector text in an SVG, the badge
 *      pixel signature in a raster
 *   5. no product repeats the same image bytes across its gallery
 *
 * With --live it additionally downloads what production serves, follows the
 * Next.js optimizer URL, and re-runs the pixel check on those bytes — so the
 * final proof is against what a customer receives, not against local files.
 */
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hasBadgePixels, hasBadgeVector, badgeSignature } from "./verify-badge.mjs";

const prisma = new PrismaClient();
const PUBLIC = join(process.cwd(), "public");
const LIVE = process.argv.find((a, i) => process.argv[i - 1] === "--live");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const fail = [];
const note = (msg) => fail.push(msg);

// ── Files the database points at ──────────────────────────────
const products = await prisma.product.findMany({
  where: { NOT: { name: { startsWith: "E2E Test" } } },
  select: { name: true, slug: true, sku: true, images: true, category: { select: { slug: true, name: true } } },
  orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
});

let photos = 0, illustrations = 0, checked = 0, branded = 0, dupes = 0;

for (const p of products) {
  if (!p.images.length) { note(`${p.name}: no images at all`); continue; }
  const seen = new Map();

  for (const [i, webPath] of p.images.entries()) {
    checked++;
    const disk = join(PUBLIC, webPath.replace(/^\//, ""));
    if (!existsSync(disk)) { note(`${p.name} slot ${i + 1}: missing ${webPath}`); continue; }

    const bytes = readFileSync(disk);
    if (!bytes.length) { note(`${p.name} slot ${i + 1}: zero bytes`); continue; }

    // Correct product?
    if (!webPath.startsWith(`/products/${p.category.slug}/`)) {
      note(`${p.name} slot ${i + 1}: outside its category folder`);
    }
    const base = webPath.split("/").pop().replace(/\.(png|svg|webp|jpe?g)$/i, "").replace(/-[23]$/, "");
    if (base !== slugify(p.name)) note(`${p.name} slot ${i + 1}: named for "${base}"`);

    // Duplicate bytes within one gallery?
    const h = createHash("sha256").update(bytes).digest("hex");
    if (seen.has(h)) { dupes++; note(`${p.name}: slots ${seen.get(h)} and ${i + 1} are the same image`); }
    else seen.set(h, i + 1);

    // The mark itself.
    if (webPath.endsWith(".svg")) {
      if (i === 0) illustrations++;
      if (hasBadgeVector(bytes.toString("utf8"))) branded++;
      else note(`${p.name} slot ${i + 1}: SVG has no SGT ORIGINAL vector badge`);
    } else {
      if (i === 0) photos++;
      try {
        const m = await sharp(bytes).metadata();
        if (await hasBadgePixels(bytes, m.width, m.height)) branded++;
        else note(`${p.name} slot ${i + 1}: no SGT ORIGINAL in the pixels`);
      } catch (e) {
        note(`${p.name} slot ${i + 1}: unreadable (${e.message.slice(0, 30)})`);
      }
    }
  }
}

// ── Category hero images ──────────────────────────────────────
const categories = await prisma.category.findMany({ select: { name: true, slug: true, imageUrl: true } });
let heroes = 0, heroBranded = 0;
for (const c of categories) {
  if (!c.imageUrl) { note(`category ${c.slug}: no hero image`); continue; }
  heroes++;
  const disk = join(PUBLIC, c.imageUrl.replace(/^\//, ""));
  if (!existsSync(disk)) { note(`category ${c.slug}: hero missing ${c.imageUrl}`); continue; }
  if (!c.imageUrl.startsWith(`/products/${c.slug}/`)) note(`category ${c.slug}: hero belongs to another category`);
  const bytes = readFileSync(disk);
  const ok = c.imageUrl.endsWith(".svg")
    ? hasBadgeVector(bytes.toString("utf8"))
    : await hasBadgePixels(bytes, (await sharp(bytes).metadata()).width, (await sharp(bytes).metadata()).height);
  if (ok) heroBranded++; else note(`category ${c.slug}: hero has no SGT ORIGINAL`);
}

// ── Live production ───────────────────────────────────────────
let liveChecked = 0, liveBranded = 0, liveRows = [];
if (LIVE) {
  const sample = products.filter((p) =>
    ["professional-shampoo", "hard-wax-beans", "professional-wax-heater", "matte-hair-wax",
     "disposable-wax-spatulas", "aloe-vera-gel", "hair-growth-oil", "professional-hair-dryer"]
      .includes(p.slug));

  for (const p of sample) {
    const url = p.images[0];
    const pageRes = await fetch(`${LIVE}/products/${p.slug}`);
    const html = await pageRes.text();
    const inHtml = html.includes(encodeURIComponent(url)) || html.includes(url);

    // Raw asset — what a customer gets if they open the file directly.
    const rawRes = await fetch(`${LIVE}${url}`);
    const rawBuf = Buffer.from(await rawRes.arrayBuffer());

    let ok = false, sig = null, format = "?", servedUrl = url, mime = rawRes.headers.get("content-type");

    if (url.endsWith(".svg")) {
      // Next.js does not rasterise SVG through the optimizer (dangerouslyAllowSVG
      // is off, correctly — an SVG can carry script). So the vector source IS
      // what production serves, and the badge is verified in that source.
      format = "svg";
      ok = hasBadgeVector(rawBuf.toString("utf8"));
    } else {
      // Follow the optimizer and test the bytes it actually emits.
      servedUrl = `${LIVE}/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
      const optRes = await fetch(servedUrl);
      const optBuf = Buffer.from(await optRes.arrayBuffer());
      mime = optRes.headers.get("content-type");
      try {
        const m = await sharp(optBuf).metadata();
        format = m.format;
        const asPng = await sharp(optBuf).png().toBuffer();
        sig = await badgeSignature(asPng, m.width, m.height);
        ok = await hasBadgePixels(asPng, m.width, m.height);
      } catch { /* stays not ok */ }
    }

    liveChecked++;
    if (ok) liveBranded++;
    else note(`LIVE ${p.slug}: served ${format} has no SGT ORIGINAL`);
    if (pageRes.status !== 200) note(`LIVE ${p.slug}: HTTP ${pageRes.status}`);
    if (!inHtml) note(`LIVE ${p.slug}: HTML does not reference ${url}`);

    liveRows.push({
      product: p.name, http: pageRes.status, format, url, servedUrl,
      raw: rawRes.status, mime,
      plate: sig ? (sig.plate * 100).toFixed(0) + "%" : "vector", ok, inHtml,
    });
  }
}

// ── Report ────────────────────────────────────────────────────
console.log(`
  IMAGE VERIFICATION

  Products:                ${products.length}
  Real photographs:        ${photos}
  Illustrations:           ${illustrations}
  Images checked:          ${checked}
  SGT branded:             ${branded}
  Category heroes:         ${heroes} (${heroBranded} branded)
  Missing / broken:        ${fail.filter((f) => /missing|zero bytes|unreadable/.test(f)).length}
  Wrong product mapping:   ${fail.filter((f) => /category folder|named for/.test(f)).length}
  Duplicate gallery images:${String(dupes).padStart(2)}`);

if (LIVE) {
  console.log(`
  LIVE (${LIVE})
  ${"Product".padEnd(26)}${"HTTP".padEnd(6)}${"Fmt".padEnd(6)}${"raw".padEnd(5)}${"plate".padEnd(8)}SGT ORIGINAL`);
  for (const r of liveRows) {
    const how = r.format === "svg" ? "VERIFIED IN SVG SOURCE" : "VERIFIED IN PIXELS";
    console.log(`  ${r.product.slice(0, 24).padEnd(26)}${String(r.http).padEnd(6)}${String(r.format).padEnd(6)}${String(r.raw).padEnd(5)}${r.plate.padEnd(8)}${r.ok ? how : "NOT FOUND"}`);
  }
  console.log(`\n  Live images checked: ${liveChecked}   branded: ${liveBranded}`);
}

if (fail.length) {
  console.log(`\n  FAILED — ${fail.length} problem(s):`);
  fail.slice(0, 20).forEach((f) => console.log(`    ${f}`));
  if (fail.length > 20) console.log(`    … and ${fail.length - 20} more`);
} else {
  console.log(`\n  ALL CHECKS PASSED`);
}
console.log();

await prisma.$disconnect();
process.exitCode = fail.length ? 1 : 0;
