/**
 * Generates the placeholder product imagery under public/products/.
 *
 * These are clean, category-coded SVG placeholders that name the product —
 * NOT brand photography. They exist so the storefront looks populated and
 * every product is visually identifiable until Shree Gopi Traders supplies
 * real photographs. Dropping a real JPG/PNG at the same path replaces the
 * placeholder with no code change, because the seed stores these paths on
 * the Product.images array.
 *
 * Run with: npm run images
 *
 * Output per product:
 *   public/products/<category-slug>/<product-slug>.svg        (primary)
 *   public/products/<category-slug>/<product-slug>-2.svg      (gallery)
 *   public/products/<category-slug>/<product-slug>-3.svg      (gallery)
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { CATALOG } from "../prisma/catalog-data.ts";

// One hue per category so a product reads as belonging to its department.
const PALETTE = {
  "hair-care": ["#0f766e", "#5eead4"],
  "hair-styling": ["#115e59", "#99f6e4"],
  "hair-color-treatment": ["#7c2d12", "#fed7aa"],
  "hair-equipment": ["#1e3a8a", "#bfdbfe"],
  "skin-care": ["#9d174d", "#fbcfe8"],
  "facial-products": ["#a21caf", "#f5d0fe"],
  waxing: ["#9a3412", "#fed7aa"],
  "manicure-pedicure": ["#5b21b6", "#ddd6fe"],
  "nail-products": ["#6b21a8", "#e9d5ff"],
  makeup: ["#be123c", "#fecdd3"],
  "beauty-consumables": ["#334155", "#cbd5e1"],
  "salon-furniture": ["#3f3f46", "#e4e4e7"],
  "professional-equipment": ["#075985", "#bae6fd"],
  "barber-supplies": ["#1c1917", "#d6d3d1"],
  "cleaning-hygiene": ["#166534", "#bbf7d0"],
};

const FALLBACK = ["#0f172a", "#cbd5e1"];

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Greedy word wrap so long product names stay inside the tile. */
function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Three compositions so a product's gallery isn't three identical tiles. */
function artwork(variant, light) {
  if (variant === 2) {
    return `
  <rect x="150" y="170" width="300" height="200" rx="16" fill="none" stroke="${light}" stroke-width="5" opacity="0.5"/>
  <path d="M150 300h300" stroke="${light}" stroke-width="5" opacity="0.35"/>
  <circle cx="220" cy="240" r="26" fill="${light}" opacity="0.3"/>
  <rect x="270" y="222" width="130" height="14" rx="7" fill="${light}" opacity="0.3"/>
  <rect x="270" y="252" width="90" height="14" rx="7" fill="${light}" opacity="0.22"/>`;
  }
  if (variant === 3) {
    return `
  <rect x="185" y="150" width="110" height="240" rx="14" fill="none" stroke="${light}" stroke-width="5" opacity="0.5"/>
  <rect x="305" y="200" width="110" height="190" rx="14" fill="none" stroke="${light}" stroke-width="5" opacity="0.35"/>
  <rect x="205" y="130" width="70" height="26" rx="8" fill="${light}" opacity="0.35"/>
  <rect x="325" y="180" width="70" height="26" rx="8" fill="${light}" opacity="0.25"/>`;
  }
  return `
  <circle cx="300" cy="235" r="92" fill="none" stroke="${light}" stroke-width="6" opacity="0.55"/>
  <path d="M252 235h96M300 187v96" stroke="${light}" stroke-width="6" stroke-linecap="round" opacity="0.5"/>
  <rect x="180" y="368" width="240" height="6" rx="3" fill="${light}" opacity="0.28"/>`;
}

function svg({ productName, categoryName, dark, light, variant }) {
  const lines = wrap(productName, 26);
  const startY = 440 - (lines.length - 1) * 15;
  const nameText = lines
    .map(
      (l, i) =>
        `<text x="300" y="${startY + i * 30}" font-family="ui-sans-serif,system-ui,-apple-system,sans-serif" font-size="24" font-weight="600" fill="${light}" text-anchor="middle">${esc(l)}</text>`
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(productName)} — ${esc(categoryName)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${dark}"/>
      <stop offset="100%" stop-color="${dark}" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  ${artwork(variant, light)}
  ${nameText}
  <text x="300" y="${startY + lines.length * 30 + 14}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" fill="${light}" text-anchor="middle" opacity="0.65">${esc(categoryName)}</text>
  <text x="300" y="558" font-family="ui-sans-serif,system-ui,sans-serif" font-size="11" letter-spacing="2.5" fill="${light}" text-anchor="middle" opacity="0.45">SHREE GOPI TRADERS</text>
</svg>`;
}

// Rebuild cleanly so renamed products don't leave orphan files behind.
rmSync("public/products", { recursive: true, force: true });

let files = 0;
for (const category of CATALOG) {
  const dir = `public/products/${category.slug}`;
  mkdirSync(dir, { recursive: true });
  const [dark, light] = PALETTE[category.slug] ?? FALLBACK;

  for (const product of category.products) {
    const slug = slugify(product.name);
    for (const variant of [1, 2, 3]) {
      const suffix = variant === 1 ? "" : `-${variant}`;
      writeFileSync(
        `${dir}/${slug}${suffix}.svg`,
        svg({ productName: product.name, categoryName: category.name, dark, light, variant })
      );
      files++;
    }
  }

  // A banner used as the category tile on the storefront.
  writeFileSync(
    `${dir}/_category.svg`,
    svg({ productName: category.name, categoryName: "Professional Supplies", dark, light, variant: 2 })
  );
  files++;
}

console.log(`Generated ${files} placeholder images across ${CATALOG.length} categories.`);
