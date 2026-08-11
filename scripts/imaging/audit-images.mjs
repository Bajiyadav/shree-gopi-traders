/**
 * CATALOGUE IMAGE AUDIT
 *
 *   node scripts/imaging/audit-images.mjs             # report to stdout
 *   node scripts/imaging/audit-images.mjs --csv out.csv
 *
 * Reads the database, checks every referenced image against the filesystem and
 * decodes each one, then reports per product and in total. Read-only — it never
 * writes to the database.
 *
 * Checks, per referenced file:
 *   exists · non-zero · decodes as a real image · sensible dimensions ·
 *   lives in its own product's category folder · filename matches its own
 *   product slug · carries the SGT mark
 *
 * And across the catalogue:
 *   no product missing a main image · no image used by two different products
 */
import sharp from "sharp";
import { existsSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PUBLIC = join(process.cwd(), "public");
const CSV = process.argv.find((a, i) => process.argv[i - 1] === "--csv");

const MIN_EDGE = 200;
const manifestPath = "scripts/imaging/branded-manifest.json";
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function inspect(webPath) {
  if (/^https?:\/\//.test(webPath)) return { ok: true, kind: "remote", note: "CDN" };
  const disk = join(PUBLIC, webPath.replace(/^\//, ""));
  if (!existsSync(disk)) return { ok: false, kind: "missing", note: "file not found" };
  const size = statSync(disk).size;
  if (size === 0) return { ok: false, kind: "empty", note: "zero bytes" };

  try {
    const meta = await sharp(disk).metadata();
    const edge = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (edge < MIN_EDGE) return { ok: false, kind: meta.format, note: `${meta.width}x${meta.height} too small` };
    const marked = webPath.endsWith(".svg")
      ? readFileSync(disk, "utf8").includes('id="sgt-mark"')
      : manifest[`public${webPath}`] !== undefined;
    return { ok: true, kind: meta.format, w: meta.width, h: meta.height, size, marked };
  } catch (e) {
    return { ok: false, kind: "unreadable", note: e.message.slice(0, 40) };
  }
}

const products = await prisma.product.findMany({
  where: { NOT: { name: { startsWith: "E2E Test" } } },
  select: { name: true, slug: true, sku: true, images: true, category: { select: { slug: true, name: true } } },
  orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
});

const rows = [];
const usage = new Map();          // image path -> [product slugs]
let photos = 0, illustrations = 0, broken = 0, crossWired = 0, missingMain = 0, unmarked = 0;

for (const p of products) {
  const checks = await Promise.all(p.images.map(inspect));
  const issues = [];

  if (!p.images.length) { missingMain++; issues.push("no images at all"); }

  for (const [i, webPath] of p.images.entries()) {
    const c = checks[i];
    usage.set(webPath, [...(usage.get(webPath) ?? []), p.slug]);

    if (!c.ok) { broken++; issues.push(`slot ${i + 1}: ${c.note}`); if (i === 0) missingMain++; continue; }
    if (c.kind === "remote") continue;

    // Must live in its own category folder and be named for its own product.
    const expectedDir = `/products/${p.category.slug}/`;
    if (!webPath.startsWith(expectedDir)) { crossWired++; issues.push(`slot ${i + 1}: wrong category folder`); }
    const base = webPath.split("/").pop().replace(/\.(png|svg|webp|jpe?g)$/i, "").replace(/-[23]$/, "");
    if (base !== slugify(p.name)) { crossWired++; issues.push(`slot ${i + 1}: named for "${base}"`); }
    if (!c.marked) { unmarked++; issues.push(`slot ${i + 1}: no SGT mark`); }
  }

  const mainKind = checks[0]?.kind ?? "none";
  const type = mainKind === "png" || mainKind === "webp" || mainKind === "jpeg" ? "Photograph"
             : mainKind === "svg" ? "Illustration" : "—";
  if (type === "Photograph") photos++; else if (type === "Illustration") illustrations++;

  rows.push({
    product: p.name, sku: p.sku, category: p.category.name,
    main: p.images[0] ?? "", g2: p.images[1] ?? "", g3: p.images[2] ?? "",
    type, status: issues.length ? issues.join("; ") : "OK",
  });
}

const duplicates = [...usage.entries()].filter(([, owners]) => new Set(owners).size > 1);

// ── Report ────────────────────────────────────────────────────
console.log(`\n  ${"PRODUCT".padEnd(38)}${"SKU".padEnd(14)}${"TYPE".padEnd(14)}STATUS`);
console.log("  " + "─".repeat(96));
for (const r of rows.filter((r) => r.status !== "OK")) {
  console.log(`  ${r.product.slice(0, 36).padEnd(38)}${r.sku.padEnd(14)}${r.type.padEnd(14)}${r.status.slice(0, 40)}`);
}
if (!rows.some((r) => r.status !== "OK")) console.log("  (every product passed — no rows to show)");

console.log(`
  ══ CATALOGUE IMAGE REPORT ══════════════════════════════

  TOTAL PRODUCTS         : ${products.length}

  Photographic images    : ${photos}
  Illustrated fallback   : ${illustrations}
  Broken images          : ${broken}
  Missing main image     : ${missingMain}
  Cross-wired images     : ${crossWired}
  Duplicate assignments  : ${duplicates.length}
  Without the SGT mark   : ${unmarked}

  Image references checked: ${rows.reduce((n, r) => n + [r.main, r.g2, r.g3].filter(Boolean).length, 0)}
`);

if (duplicates.length) {
  console.log("  Duplicates:");
  duplicates.slice(0, 6).forEach(([path, owners]) =>
    console.log(`    ${path} used by ${[...new Set(owners)].join(", ")}`));
}

if (CSV) {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = ["Product,SKU,Category,Main Image,Gallery 2,Gallery 3,Image Type,Status",
    ...rows.map((r) => [r.product, r.sku, r.category, r.main, r.g2, r.g3, r.type, r.status].map(esc).join(","))]
    .join("\n");
  writeFileSync(CSV, "﻿" + csv);
  console.log(`  Full report written to ${CSV}\n`);
}

await prisma.$disconnect();
process.exitCode = broken + crossWired + missingMain + duplicates.length > 0 ? 1 : 0;
