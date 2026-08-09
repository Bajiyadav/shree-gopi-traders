/**
 * Shared product lookup for the image tooling.
 *
 * `images:urls` (point products at existing URLs) and `images:cloudinary`
 * (upload files, then point products at them) both need to answer the same
 * question: given a key like `SGT-HC-001` or `jar`, which products does it
 * mean? Keeping one implementation means the two can never disagree about
 * what a mapping file says.
 */
import { CATALOG } from "../../prisma/catalog-data.ts";

/** next.config.js allows exactly this one remote image host. */
export const ALLOWED_HOST = "res.cloudinary.com";

export const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Mirrors the shape routing used by the illustration generator, so a key like
// `jar` selects the same products the generator drew as jars.
const SHAPE_RULES = [
  [/dryer/i, "hair-dryer"], [/straighten|flat.?iron|crimper|curler|curling/i, "flat-iron"],
  [/clipper|trimmer|shaving machine/i, "clipper"], [/scissor|shear/i, "scissors"],
  [/razor|blade/i, "razor"],
  [/chair|bed|station|stool|mirror unit|cabinet|table/i, "chair"], [/trolley/i, "trolley"],
  [/steamer|steriliz|sterilis|machine|hot towel|magnifying|high frequency|foot spa|heater/i, "machine"],
  [/uv\/led|uv lamp|led lamp|nail lamp/i, "lamp"],
  [/nail polish|gel polish|top coat|nail glue/i, "polish"],
  [/palette|eyeshadow/i, "palette"], [/lipstick|lip colour|lip color/i, "lipstick"],
  [/towel/i, "towels"], [/glove|cap|sheet|strip|tissue|cotton|foil|apron|cape/i, "box"],
  [/brush|comb/i, "brush-set"],
  [/bowl|manicure kit|pedicure kit|cutter|cuticle|file|tips|nail art|drill/i, "tools"],
  [/spray|toner|rose water|disinfect|sanitiz|sanitis|cleaner|after shave/i, "spray-bottle"],
  [/serum|oil|dropper/i, "dropper"],
  [/jar|wax|pomade|mask|spa cream|massage cream|pack|scrub|powder|acrylic|bleach|beans/i, "jar"],
  [/cream|gel|lotion|moisturi|cleanser|concealer|foundation|mascara|eyeliner/i, "tube"],
  [/kit|set|liner/i, "carton"],
];

export const shapeFor = (name) =>
  SHAPE_RULES.find(([re]) => re.test(name))?.[1] ?? "pump-bottle";

/** Every catalogue product with the identifiers a mapping key can match on. */
export function buildProductIndex() {
  const products = [];
  for (const category of CATALOG) {
    for (const [pi, product] of category.products.entries()) {
      products.push({
        name: product.name,
        slug: slugify(product.name),
        sku: `SGT-${category.skuCode}-${String(pi + 1).padStart(3, "0")}`,
        categorySlug: category.slug,
        categoryName: category.name,
        shape: shapeFor(product.name),
      });
    }
  }
  return products;
}

/** Lower rank wins when two keys touch the same product and slot. */
export const MATCH_RANK = { "product slug": 0, SKU: 1, "packaging type": 2, category: 3 };

/**
 * Resolves a mapping key to products, most specific first.
 * A trailing `-2` / `-3` targets that gallery slot.
 */
export function resolveKey(rawKey, products) {
  const slotMatch = rawKey.match(/-([23])$/);
  const slot = slotMatch ? Number(slotMatch[1]) : 1;
  const key = slugify(slotMatch ? rawKey.slice(0, -2) : rawKey);

  let targets = products.filter((p) => p.slug === key);
  let how = "product slug";
  if (!targets.length) { targets = products.filter((p) => slugify(p.sku) === key); how = "SKU"; }
  if (!targets.length) { targets = products.filter((p) => p.shape === key); how = "packaging type"; }
  if (!targets.length) { targets = products.filter((p) => p.categorySlug === key); how = "category"; }

  return targets.length ? { targets, how, slot } : null;
}

/**
 * Cloudinary serves a modern format and sensible quality when asked. Injecting
 * f_auto,q_auto costs nothing and typically halves the bytes; if the URL
 * already carries transformations we leave it alone.
 */
export function optimise(url) {
  if (!url.includes("/upload/")) return url;
  if (/\/upload\/[^/]*[fq]_auto/.test(url)) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

/**
 * Merges new URLs into a product's gallery by slot, so a mapping that supplies
 * only a main image leaves slots 2 and 3 as they were.
 */
export function mergeSlots(current, slots) {
  const next = [...current];
  for (const [slot, url] of Object.entries(slots)) next[Number(slot) - 1] = url;
  return next.filter(Boolean);
}
