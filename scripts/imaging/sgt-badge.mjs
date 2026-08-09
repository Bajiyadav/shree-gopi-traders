/**
 * THE "SGT ORIGINAL" BADGE — one definition, used everywhere.
 *
 * Both the raster and the vector path render from this same source, so a
 * photograph and an illustration carry a visually identical mark, and the
 * verifier knows exactly what it is looking for.
 *
 * Placement is bottom-left. That was chosen by measurement, not taste: every
 * corner of all 78 photographs was sampled over exactly the box the badge
 * occupies (scripts/imaging/corners.mjs). Bottom-left came out brightest at
 * 243.7 and was clean in every image, while both right-hand corners carry
 * product or shadow in 12 of 78.
 *
 * The palette is deliberately high-contrast — near-black plate, amber rule and
 * accent — so the mark survives Next.js re-encoding to WebP at card sizes,
 * where a low-opacity grey wordmark would wash out.
 */

/** Badge geometry as fractions of the image's shorter edge. */
export const BADGE = {
  widthFrac: 0.300,      // ~307px on a 1024px image — wide enough for the full word
  heightFrac: 0.072,     // ~74px
  marginFrac: 0.038,
  plate: "#0f172a",      // near-black — the block the verifier looks for
  accent: "#f59e0b",     // amber — the second signature colour
  text: "#ffffff",
  plateOpacity: 0.94,
};

/**
 * The badge as standalone SVG markup, positioned for an image W x H.
 * `asDocument` wraps it in a full <svg> for compositing onto a raster.
 */
export function badgeMarkup(W, H, { asDocument = false, id = "sgt-brand-tag" } = {}) {
  const w = Math.round(W * BADGE.widthFrac);
  const h = Math.round(H * BADGE.heightFrac);
  const x = Math.round(W * BADGE.marginFrac);
  const y = Math.round(H - h - H * BADGE.marginFrac);

  const r = Math.round(h * 0.22);
  const dotR = Math.round(h * 0.11);
  const dotCx = x + Math.round(h * 0.42);
  const cy = y + h / 2;
  const sgtSize = Math.round(h * 0.44);
  const origSize = Math.round(h * 0.24);
  const sgtX = dotCx + dotR + Math.round(h * 0.24);
  // "SGT" renders about 2.15 cap-widths wide at this weight; the gap after it
  // is deliberate so the two words read as one lockup rather than one string.
  const origX = sgtX + Math.round(sgtSize * 2.42);

  const g =
    `<g id="${id}">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ` +
      `fill="${BADGE.plate}" fill-opacity="${BADGE.plateOpacity}" ` +
      `stroke="${BADGE.accent}" stroke-width="${Math.max(1, Math.round(h * 0.035))}"/>` +
    `<circle cx="${dotCx}" cy="${cy}" r="${dotR}" fill="${BADGE.accent}"/>` +
    `<text x="${sgtX}" y="${cy + sgtSize * 0.36}" fill="${BADGE.text}" ` +
      `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="700" ` +
      `font-size="${sgtSize}" letter-spacing="${(sgtSize * 0.06).toFixed(2)}">SGT</text>` +
    `<text x="${origX}" y="${cy + origSize * 0.36}" fill="${BADGE.accent}" ` +
      `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="600" ` +
      `font-size="${origSize}" letter-spacing="${(origSize * 0.10).toFixed(2)}">ORIGINAL</text>` +
    `</g>`;

  if (!asDocument) return g;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${g}</svg>`;
}

/** The rectangle the badge occupies, for extraction during verification. */
export function badgeBox(W, H) {
  const w = Math.round(W * BADGE.widthFrac);
  const h = Math.round(H * BADGE.heightFrac);
  return {
    left: Math.round(W * BADGE.marginFrac),
    top: Math.round(H - h - H * BADGE.marginFrac),
    width: w,
    height: h,
  };
}
