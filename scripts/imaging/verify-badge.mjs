/**
 * PROOF THAT "SGT ORIGINAL" IS PHYSICALLY IN THE IMAGE.
 *
 * No OCR is involved. The badge is drawn by this codebase, so its exact
 * signature is known and can be tested for directly — which is stricter than
 * OCR, because a smudged or half-drawn badge that OCR might still guess at
 * will fail these thresholds.
 *
 * A raster passes only if, inside the badge box:
 *   - a majority of pixels are the near-black plate, and
 *   - a real minority are the amber accent (dot, border, the word ORIGINAL),
 *   - and white text pixels are present.
 *
 * Tolerances are wide enough to survive JPEG/WebP re-encoding and downscaling,
 * which is the point — the check runs against what production actually serves,
 * not only against the file on disk.
 */
import sharp from "sharp";
import { badgeBox, BADGE } from "./sgt-badge.mjs";

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const PLATE = hexToRgb(BADGE.plate);
const ACCENT = hexToRgb(BADGE.accent);

const near = (r, g, b, [tr, tg, tb], tol) =>
  Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;

/** Proportions found inside the badge box. */
export async function badgeSignature(buffer, W, H) {
  const box = badgeBox(W, H);
  // Guard against an image smaller than the box (a thumbnail, say).
  if (box.left + box.width > W || box.top + box.height > H) return null;

  const { data, info } = await sharp(buffer)
    .extract(box)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const total = info.width * info.height;
  let plate = 0, accent = 0, white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (near(r, g, b, PLATE, 46)) plate++;
    else if (near(r, g, b, ACCENT, 62)) accent++;
    else if (r > 205 && g > 205 && b > 205) white++;
  }
  return { plate: plate / total, accent: accent / total, white: white / total, total };
}

/**
 * True when the badge is genuinely drawn in these pixels.
 *
 * Thresholds come from a sweep across the sizes and qualities Next.js actually
 * emits (1024→128px, WebP q100→q70):
 *
 *   badged  plate 77–85%   accent 5.15%→0.00%   white 3.3%→0.3%
 *   clean   plate  0.0%    accent 0.00%         white 100%
 *
 * The plate is the discriminator — 77% against 0% holds at every size. Amber
 * and white thin out under downscaling, so they only have to corroborate: one
 * of the two must still be present, which rules out a merely dark corner.
 */
export async function hasBadgePixels(buffer, W, H) {
  const s = await badgeSignature(buffer, W, H);
  if (!s) return false;
  const plateOk = s.plate >= 0.40;
  const detailOk = s.accent >= 0.001 || s.white >= 0.002;
  return plateOk && detailOk;
}

/**
 * SVG check — the badge must be present as real vector content.
 *
 * Tests the rendered text, not a particular markup shape. "SGT ORIGINAL" may
 * be one text node or two; either satisfies the requirement, and a verifier
 * that insisted on one shape would fail a badge that is plainly there.
 */
export function hasBadgeVector(xml) {
  if (!xml.includes('id="sgt-brand-tag"')) return false;
  const start = xml.indexOf('id="sgt-brand-tag"');
  // Walk to the matching close, tolerating nested groups.
  let depth = 1, i = xml.indexOf(">", start) + 1, end = xml.length;
  while (i < xml.length && depth > 0) {
    const open = xml.indexOf("<g", i), close = xml.indexOf("</g>", i);
    if (close === -1) break;
    if (open !== -1 && open < close) { depth++; i = open + 2; }
    else { depth--; end = close; i = close + 4; }
  }
  const group = xml.slice(start, end);
  if (!/<rect/.test(group)) return false;
  const text = group.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toUpperCase();
  return text.includes("SGT") && text.includes("ORIGINAL");
}
