/**
 * Generates the placeholder product imagery under public/products/.
 *
 * These are VECTOR ILLUSTRATIONS, not photographs. Each product is drawn as a
 * recognisable silhouette for its packaging type (pump bottle, jar, tube,
 * dryer, clipper, chair…) on a clean studio background with a soft shadow —
 * so a shampoo looks like a bottle and a salon chair looks like a chair.
 *
 * They are deliberately generic: no real brand marks, no imitation of any
 * manufacturer's packaging. They exist so the storefront reads as a stocked
 * catalogue until Shree Gopi Traders supplies real photography.
 *
 * To swap in real photos, drop files at the same paths — the seed stores these
 * paths on Product.images, so no code changes are needed.
 *
 * Run with: npm run images
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { CATALOG } from "../prisma/catalog-data.ts";

// ── Palette ───────────────────────────────────────────────────
// One accent hue per department so a product reads as belonging to its
// section, over a consistent near-white studio ground.
const ACCENT = {
  "hair-care": ["#0f766e", "#14b8a6"],
  "hair-styling": ["#0e7490", "#22d3ee"],
  "hair-color-treatment": ["#9a3412", "#f97316"],
  "hair-equipment": ["#1e3a8a", "#3b82f6"],
  "skin-care": ["#9d174d", "#ec4899"],
  "facial-products": ["#86198f", "#d946ef"],
  waxing: ["#a16207", "#eab308"],
  "manicure-pedicure": ["#5b21b6", "#8b5cf6"],
  "nail-products": ["#6b21a8", "#a855f7"],
  makeup: ["#be123c", "#f43f5e"],
  "beauty-consumables": ["#334155", "#64748b"],
  "salon-furniture": ["#3f3f46", "#71717a"],
  "professional-equipment": ["#075985", "#0ea5e9"],
  "barber-supplies": ["#292524", "#78716c"],
  "cleaning-hygiene": ["#166534", "#22c55e"],
};
const FALLBACK = ["#334155", "#64748b"];

const GROUND = "#f6f7f8";
const GROUND_2 = "#eceef0";
const INK = "#1e293b";
const CAP = "#0f172a";
const LABEL = "#ffffff";

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Shape library ─────────────────────────────────────────────
// Each returns SVG drawn inside a 600×600 frame, product centred and occupying
// roughly 70–85% of the height. `a` is the dark accent, `b` the light accent.

const SHAPES = {
  pumpBottle: (a, b) => `
    <rect x="248" y="96" width="26" height="54" rx="6" fill="${CAP}"/>
    <path d="M261 96h44a16 16 0 0 1 16 16v6h-60z" fill="${CAP}"/>
    <rect x="236" y="148" width="52" height="26" rx="8" fill="${INK}"/>
    <path d="M212 174h100a26 26 0 0 1 26 26v250a26 26 0 0 1-26 26H212a26 26 0 0 1-26-26V200a26 26 0 0 1 26-26z" fill="url(#body)"/>
    <rect x="200" y="250" width="124" height="132" rx="10" fill="${LABEL}" opacity="0.94"/>
    <rect x="216" y="276" width="92" height="9" rx="4.5" fill="${a}" opacity="0.85"/>
    <rect x="216" y="296" width="66" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="216" y="336" width="92" height="5" rx="2.5" fill="${b}" opacity="0.7"/>`,

  tube: (a, b) => `
    <rect x="262" y="104" width="76" height="34" rx="10" fill="${CAP}"/>
    <path d="M254 138h92l-14 44H268z" fill="${INK}" opacity="0.9"/>
    <path d="M262 182h76c16 0 28 12 28 28v230c0 16-12 28-28 28h-76c-16 0-28-12-28-28V210c0-16 12-28 28-28z" fill="url(#body)"/>
    <rect x="246" y="250" width="108" height="120" rx="9" fill="${LABEL}" opacity="0.94"/>
    <rect x="262" y="274" width="76" height="9" rx="4.5" fill="${a}" opacity="0.85"/>
    <rect x="262" y="294" width="54" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <path d="M234 462h132v14a12 12 0 0 1-12 12H246a12 12 0 0 1-12-12z" fill="${INK}" opacity="0.5"/>`,

  jar: (a, b) => `
    <rect x="186" y="150" width="228" height="60" rx="16" fill="${CAP}"/>
    <rect x="200" y="196" width="200" height="18" rx="6" fill="${INK}" opacity="0.65"/>
    <path d="M196 210h208a20 20 0 0 1 20 20v186a26 26 0 0 1-26 26H202a26 26 0 0 1-26-26V230a20 20 0 0 1 20-20z" fill="url(#body)"/>
    <rect x="206" y="272" width="188" height="110" rx="10" fill="${LABEL}" opacity="0.94"/>
    <rect x="232" y="298" width="136" height="10" rx="5" fill="${a}" opacity="0.85"/>
    <rect x="232" y="322" width="96" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="232" y="352" width="136" height="5" rx="2.5" fill="${b}" opacity="0.7"/>`,

  sprayBottle: (a, b) => `
    <path d="M300 92h34a14 14 0 0 1 14 14v10h-48z" fill="${CAP}"/>
    <path d="M262 116h56v22h-56z" fill="${INK}"/>
    <path d="M252 138h96l10 30H242z" fill="${INK}" opacity="0.75"/>
    <path d="M226 168h148a22 22 0 0 1 22 22v244a24 24 0 0 1-24 24H228a24 24 0 0 1-24-24V190a22 22 0 0 1 22-22z" fill="url(#body)"/>
    <rect x="216" y="248" width="168" height="128" rx="10" fill="${LABEL}" opacity="0.94"/>
    <rect x="240" y="274" width="120" height="10" rx="5" fill="${a}" opacity="0.85"/>
    <rect x="240" y="298" width="86" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="240" y="342" width="120" height="5" rx="2.5" fill="${b}" opacity="0.7"/>`,

  dropper: (a, b) => `
    <rect x="266" y="112" width="68" height="26" rx="7" fill="${CAP}"/>
    <rect x="284" y="138" width="32" height="26" rx="5" fill="${INK}" opacity="0.8"/>
    <path d="M246 164h108a22 22 0 0 1 22 22v212a24 24 0 0 1-24 24H248a24 24 0 0 1-24-24V186a22 22 0 0 1 22-22z" fill="url(#body)"/>
    <rect x="236" y="238" width="128" height="112" rx="9" fill="${LABEL}" opacity="0.94"/>
    <rect x="258" y="262" width="84" height="9" rx="4.5" fill="${a}" opacity="0.85"/>
    <rect x="258" y="282" width="58" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="258" y="318" width="84" height="5" rx="2.5" fill="${b}" opacity="0.7"/>`,

  carton: (a, b) => `
    <path d="M176 168l124-40 124 40-124 42z" fill="${b}" opacity="0.55"/>
    <path d="M176 168l124 42v250l-124-46z" fill="url(#body)"/>
    <path d="M424 168l-124 42v250l124-46z" fill="${a}" opacity="0.82"/>
    <rect x="206" y="252" width="88" height="120" rx="8" fill="${LABEL}" opacity="0.9"/>
    <rect x="222" y="276" width="58" height="9" rx="4.5" fill="${a}" opacity="0.85"/>
    <rect x="222" y="296" width="40" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>`,

  hairDryer: (a, b) => `
    <rect x="150" y="196" width="230" height="112" rx="56" fill="url(#body)"/>
    <circle cx="176" cy="252" r="34" fill="${CAP}" opacity="0.85"/>
    <circle cx="176" cy="252" r="20" fill="${INK}"/>
    <rect x="366" y="216" width="56" height="72" rx="14" fill="${CAP}"/>
    <path d="M246 300h74l-26 156a22 22 0 0 1-22 18h-4a22 22 0 0 1-22-22z" fill="url(#body)"/>
    <rect x="240" y="330" width="70" height="16" rx="8" fill="${LABEL}" opacity="0.85"/>
    <rect x="246" y="360" width="52" height="10" rx="5" fill="${INK}" opacity="0.35"/>
    <path d="M262 474c-30 22-58 6-64-14" stroke="${CAP}" stroke-width="9" fill="none" stroke-linecap="round"/>`,

  flatIron: (a, b) => `
    <path d="M154 372l232-232a44 44 0 0 1 62 62L216 434a44 44 0 0 1-62-62z" fill="url(#body)"/>
    <path d="M186 340l232-232" stroke="${LABEL}" stroke-width="10" opacity="0.5" stroke-linecap="round"/>
    <rect x="332" y="150" width="84" height="26" rx="13" fill="${CAP}" transform="rotate(-45 374 163)"/>
    <circle cx="196" cy="392" r="20" fill="${CAP}"/>
    <circle cx="196" cy="392" r="9" fill="${b}"/>
    <path d="M172 424c-26 26-52 14-58-8" stroke="${CAP}" stroke-width="9" fill="none" stroke-linecap="round"/>`,

  clipper: (a, b) => `
    <path d="M234 128h132l16 34H218z" fill="${CAP}"/>
    <path d="M218 162h164v16H218z" fill="${b}" opacity="0.95"/>
    ${Array.from({ length: 11 }, (_, i) => `<rect x="${224 + i * 14}" y="${140}" width="8" height="22" rx="2" fill="${LABEL}" opacity="0.75"/>`).join("")}
    <path d="M232 178h136a26 26 0 0 1 26 26v212a34 34 0 0 1-34 34H240a34 34 0 0 1-34-34V204a26 26 0 0 1 26-26z" fill="url(#body)"/>
    <rect x="226" y="238" width="148" height="96" rx="10" fill="${LABEL}" opacity="0.92"/>
    <rect x="250" y="264" width="100" height="10" rx="5" fill="${a}" opacity="0.85"/>
    <rect x="250" y="288" width="68" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="262" y="356" width="76" height="16" rx="8" fill="${CAP}" opacity="0.5"/>
    <path d="M290 450h20v34h-20z" fill="${CAP}"/>
    <path d="M300 484c-34 18-58 2-62-18" stroke="${CAP}" stroke-width="9" fill="none" stroke-linecap="round"/>`,

  scissors: (a, b) => `
    <path d="M212 148l186 250" stroke="url(#stroke)" stroke-width="18" stroke-linecap="round"/>
    <path d="M388 148L202 398" stroke="${INK}" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    <circle cx="196" cy="432" r="42" fill="none" stroke="${a}" stroke-width="16"/>
    <circle cx="404" cy="432" r="42" fill="none" stroke="${INK}" stroke-width="16" opacity="0.85"/>
    <circle cx="300" cy="286" r="14" fill="${CAP}"/>`,

  salonChair: (a, b) => `
    <path d="M196 118h150a30 30 0 0 1 30 30v168h-58V178a24 24 0 0 0-24-24h-98z" fill="url(#body)"/>
    <rect x="206" y="146" width="128" height="150" rx="16" fill="${a}" opacity="0.55"/>
    <path d="M162 316h216a26 26 0 0 1 26 26v34a20 20 0 0 1-20 20H156a20 20 0 0 1-20-20v-34a26 26 0 0 1 26-26z" fill="url(#body)"/>
    <rect x="152" y="330" width="234" height="18" rx="9" fill="${LABEL}" opacity="0.3"/>
    <rect x="372" y="238" width="26" height="80" rx="12" fill="${CAP}" opacity="0.75"/>
    <rect x="256" y="396" width="34" height="52" rx="10" fill="${CAP}"/>
    <ellipse cx="273" cy="462" rx="96" ry="20" fill="${CAP}"/>
    <ellipse cx="273" cy="454" rx="96" ry="20" fill="${INK}"/>
    <path d="M196 470l-30 18M350 470l30 18" stroke="${CAP}" stroke-width="12" stroke-linecap="round"/>`,

  trolley: (a, b) => `
    <rect x="168" y="152" width="264" height="24" rx="10" fill="url(#body)"/>
    <rect x="168" y="248" width="264" height="24" rx="10" fill="url(#body)"/>
    <rect x="168" y="344" width="264" height="24" rx="10" fill="url(#body)"/>
    <rect x="186" y="152" width="16" height="240" rx="6" fill="${INK}" opacity="0.75"/>
    <rect x="398" y="152" width="16" height="240" rx="6" fill="${INK}" opacity="0.75"/>
    <rect x="200" y="176" width="200" height="60" rx="8" fill="${LABEL}" opacity="0.55"/>
    <rect x="200" y="272" width="200" height="60" rx="8" fill="${LABEL}" opacity="0.45"/>
    <circle cx="204" cy="424" r="26" fill="${CAP}"/><circle cx="204" cy="424" r="11" fill="${b}"/>
    <circle cx="396" cy="424" r="26" fill="${CAP}"/><circle cx="396" cy="424" r="11" fill="${b}"/>`,

  polish: (a, b) => `
    <rect x="268" y="96" width="64" height="86" rx="10" fill="${CAP}"/>
    <rect x="282" y="182" width="36" height="22" rx="5" fill="${INK}" opacity="0.8"/>
    <path d="M232 204h136a20 20 0 0 1 20 20v190a24 24 0 0 1-24 24H236a24 24 0 0 1-24-24V224a20 20 0 0 1 20-20z" fill="url(#body)"/>
    <rect x="226" y="272" width="148" height="106" rx="9" fill="${LABEL}" opacity="0.9"/>
    <rect x="252" y="298" width="96" height="9" rx="4.5" fill="${a}" opacity="0.85"/>
    <rect x="252" y="320" width="64" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>`,

  lamp: (a, b) => `
    <path d="M150 300a150 150 0 0 1 300 0v34a20 20 0 0 1-20 20H170a20 20 0 0 1-20-20z" fill="url(#body)"/>
    <path d="M186 312a114 114 0 0 1 228 0v20H186z" fill="${CAP}" opacity="0.32"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="${212 + i * 48}" y="290" width="34" height="12" rx="6" fill="${b}" opacity="0.95"/>`).join("")}
    <rect x="176" y="354" width="248" height="26" rx="10" fill="${INK}" opacity="0.6"/>
    <rect x="196" y="380" width="208" height="52" rx="14" fill="url(#body)" opacity="0.85"/>
    <rect x="236" y="398" width="128" height="16" rx="8" fill="${LABEL}" opacity="0.65"/>
    <ellipse cx="300" cy="452" rx="130" ry="18" fill="${CAP}" opacity="0.35"/>`,

  palette: (a, b) => `
    <rect x="140" y="196" width="320" height="196" rx="22" fill="url(#body)"/>
    <rect x="158" y="214" width="284" height="160" rx="14" fill="${LABEL}" opacity="0.2"/>
    ${[0, 1, 2, 3].map((r) =>
      [0, 1, 2, 3, 4, 5].map((c) =>
        `<rect x="${176 + c * 42}" y="${232 + r * 36}" width="34" height="28" rx="5" fill="${LABEL}" opacity="${0.28 + ((r + c) % 4) * 0.18}"/>`
      ).join("")
    ).join("")}
    <rect x="140" y="392" width="320" height="20" rx="8" fill="${CAP}" opacity="0.5"/>`,

  lipstick: (a, b) => `
    <path d="M262 118h76v92h-76z" fill="${b}" opacity="0.9"/>
    <path d="M262 118l76-26v118h-76z" fill="${a}"/>
    <rect x="252" y="210" width="96" height="34" rx="8" fill="${CAP}"/>
    <path d="M256 244h88a18 18 0 0 1 18 18v190a22 22 0 0 1-22 22H260a22 22 0 0 1-22-22V262a18 18 0 0 1 18-18z" fill="url(#body)"/>
    <rect x="250" y="300" width="100" height="86" rx="8" fill="${LABEL}" opacity="0.9"/>
    <rect x="270" y="324" width="60" height="9" rx="4.5" fill="${a}" opacity="0.85"/>`,

  towelStack: (a, b) => `
    <rect x="150" y="176" width="300" height="58" rx="16" fill="url(#body)"/>
    <rect x="150" y="248" width="300" height="58" rx="16" fill="${a}" opacity="0.82"/>
    <rect x="150" y="320" width="300" height="58" rx="16" fill="url(#body)"/>
    <rect x="150" y="392" width="300" height="58" rx="16" fill="${a}" opacity="0.82"/>
    <rect x="176" y="196" width="120" height="12" rx="6" fill="${LABEL}" opacity="0.5"/>
    <rect x="176" y="340" width="120" height="12" rx="6" fill="${LABEL}" opacity="0.5"/>`,

  gloveBox: (a, b) => `
    <path d="M156 226h288a24 24 0 0 1 24 24v206a24 24 0 0 1-24 24H156a24 24 0 0 1-24-24V250a24 24 0 0 1 24-24z" fill="url(#body)"/>
    <path d="M226 226h148v-42a20 20 0 0 0-20-20H246a20 20 0 0 0-20 20z" fill="${a}" opacity="0.7"/>
    <ellipse cx="300" cy="268" rx="66" ry="20" fill="${CAP}" opacity="0.55"/>
    <path d="M276 268c8-26 30-30 46-16 12 10 6 26-6 30" fill="${LABEL}" opacity="0.75"/>
    <rect x="182" y="320" width="236" height="106" rx="10" fill="${LABEL}" opacity="0.9"/>
    <rect x="212" y="346" width="150" height="10" rx="5" fill="${a}" opacity="0.85"/>
    <rect x="212" y="370" width="104" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>`,

  machine: (a, b) => `
    <rect x="176" y="130" width="248" height="180" rx="22" fill="url(#body)"/>
    <rect x="200" y="156" width="200" height="112" rx="12" fill="${LABEL}" opacity="0.22"/>
    <circle cx="250" cy="212" r="24" fill="${b}" opacity="0.9"/>
    <rect x="292" y="196" width="92" height="12" rx="6" fill="${LABEL}" opacity="0.6"/>
    <rect x="292" y="220" width="64" height="10" rx="5" fill="${LABEL}" opacity="0.4"/>
    <rect x="284" y="310" width="32" height="112" rx="10" fill="${CAP}"/>
    <ellipse cx="300" cy="440" rx="106" ry="26" fill="${CAP}" opacity="0.85"/>
    <ellipse cx="300" cy="432" rx="106" ry="26" fill="${INK}"/>`,

  razor: (a, b) => `
    <path d="M214 124h58a16 16 0 0 1 16 16v212h-90V140a16 16 0 0 1 16-16z" fill="url(#body)" transform="rotate(-16 250 240)"/>
    <path d="M196 352h108l-8 118a20 20 0 0 1-20 18h-52a20 20 0 0 1-20-18z" fill="${CAP}" transform="rotate(-16 250 440)"/>
    <path d="M330 156l86 86" stroke="${INK}" stroke-width="16" stroke-linecap="round" opacity="0.5"/>
    <rect x="222" y="176" width="52" height="10" rx="5" fill="${LABEL}" opacity="0.7" transform="rotate(-16 248 181)"/>`,

  brushSet: (a, b) => `
    ${[0, 1, 2].map((i) => {
      const x = 178 + i * 82;
      return `<rect x="${x}" y="${150 + i * 14}" width="42" height="118" rx="20" fill="${a}" opacity="${0.9 - i * 0.15}"/>
      <rect x="${x + 6}" y="${262 + i * 14}" width="30" height="26" rx="6" fill="${CAP}"/>
      <rect x="${x + 12}" y="${286 + i * 14}" width="18" height="150" rx="9" fill="url(#body)"/>`;
    }).join("")}
    <rect x="164" y="452" width="272" height="20" rx="9" fill="${CAP}" opacity="0.35"/>`,

  bowl: (a, b) => `
    <ellipse cx="300" cy="222" rx="150" ry="42" fill="${a}" opacity="0.4"/>
    <path d="M150 222c0 96 40 176 150 176s150-80 150-176z" fill="url(#body)"/>
    <ellipse cx="300" cy="222" rx="150" ry="42" fill="none" stroke="${LABEL}" stroke-width="8" opacity="0.55"/>
    <ellipse cx="300" cy="426" rx="86" ry="18" fill="${CAP}" opacity="0.4"/>`,

  canister: (a, b) => `
    <rect x="238" y="104" width="124" height="30" rx="10" fill="${CAP}"/>
    <path d="M258 134h84l12 34H246z" fill="${INK}" opacity="0.75"/>
    <path d="M212 168h176a24 24 0 0 1 24 24v242a26 26 0 0 1-26 26H214a26 26 0 0 1-26-26V192a24 24 0 0 1 24-24z" fill="url(#body)"/>
    <rect x="202" y="252" width="196" height="132" rx="10" fill="${LABEL}" opacity="0.94"/>
    <rect x="232" y="280" width="136" height="10" rx="5" fill="${a}" opacity="0.85"/>
    <rect x="232" y="304" width="94" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="232" y="346" width="136" height="5" rx="2.5" fill="${b}" opacity="0.7"/>`,
};

// ── Product → shape mapping ───────────────────────────────────
// Ordered: the first matching keyword wins, so put specific terms first.
const RULES = [
  [/dryer/i, "hairDryer"],
  [/straighten|flat iron|crimper|curler|curling/i, "flatIron"],
  [/clipper|trimmer|shaving machine/i, "clipper"],
  [/scissor|shear/i, "scissors"],
  [/razor|blade/i, "razor"],
  [/chair|bed|station|stool|mirror unit|cabinet|table/i, "salonChair"],
  [/trolley/i, "trolley"],
  [/steamer|steriliz|sterilis|machine|lamp stand|hot towel|magnifying|high frequency|foot spa/i, "machine"],
  [/uv\/led|uv lamp|led lamp|nail lamp/i, "lamp"],
  [/nail polish|gel polish|base & top|top coat|primer & dehydrator|nail glue/i, "polish"],
  [/palette|eyeshadow|concealer palette/i, "palette"],
  [/lipstick|lip colour|lip color/i, "lipstick"],
  [/towel/i, "towelStack"],
  [/glove|cap|sheet|strip|tissue|cotton|foil|neck strip|apron|cape/i, "gloveBox"],
  [/brush|comb/i, "brushSet"],
  [/bowl|manicure kit|pedicure kit|nail cutter|cuticle|foot file|nail file|nail tips|nail art|drill/i, "bowl"],
  [/spray|toner|rose water|disinfect|sanitiz|sanitis|cleaner|after shave|setting/i, "sprayBottle"],
  [/serum|oil|dropper|essence/i, "dropper"],
  [/wax heater|heater/i, "machine"],
  [/jar|wax|pomade|mask|spa cream|massage cream|pack|scrub|powder|acrylic|bleach|beans/i, "jar"],
  [/cream|gel|lotion|moisturi|cleanser|concealer|foundation|mascara|eyeliner|balm/i, "tube"],
  [/kit|facial kit|set|liner/i, "carton"],
  [/5l|5 l|canister|refill|concentrate/i, "canister"],
];

function shapeFor(productName, categorySlug) {
  for (const [re, shape] of RULES) if (re.test(productName)) return shape;
  // Category-level defaults for anything unmatched.
  if (categorySlug === "salon-furniture") return "salonChair";
  if (categorySlug === "professional-equipment") return "machine";
  if (categorySlug === "beauty-consumables") return "gloveBox";
  if (categorySlug === "cleaning-hygiene") return "sprayBottle";
  if (categorySlug === "makeup") return "tube";
  if (categorySlug === "nail-products") return "polish";
  return "pumpBottle";
}

/** Slight variation per gallery slot so three images aren't identical. */
const VIEWS = [
  { scale: 1.0, rotate: 0, dx: 0 },
  { scale: 0.9, rotate: -7, dx: -8 },
  { scale: 0.94, rotate: 6, dx: 10 },
];

function wrap(text, max) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max && line) { lines.push(line.trim()); line = w; }
    else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function svg({ productName, categoryName, shape, a, b, view }) {
  const art = SHAPES[shape](a, b);
  const v = VIEWS[view];
  const caption = wrap(productName, 30)
    .map((l, i) => `<text x="300" y="${546 + i * 20}" font-family="ui-sans-serif,system-ui,-apple-system,sans-serif" font-size="15" font-weight="500" fill="#64748b" text-anchor="middle">${esc(l)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="${esc(productName)} — ${esc(categoryName)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="${GROUND_2}"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/>
    </linearGradient>
    <radialGradient id="shadow" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>
  <rect y="470" width="600" height="130" fill="${GROUND}"/>
  <ellipse cx="300" cy="486" rx="168" ry="30" fill="url(#shadow)"/>

  <g transform="translate(${300 + v.dx} 300) rotate(${v.rotate}) scale(${v.scale}) translate(-300 -300)">
    ${art}
  </g>

  ${caption}
</svg>`;
}

// ── Generate ──────────────────────────────────────────────────
rmSync("public/products", { recursive: true, force: true });

let files = 0;
const shapeTally = {};

for (const category of CATALOG) {
  const dir = `public/products/${category.slug}`;
  mkdirSync(dir, { recursive: true });
  const [a, b] = ACCENT[category.slug] ?? FALLBACK;

  for (const product of category.products) {
    const slug = slugify(product.name);
    const shape = shapeFor(product.name, category.slug);
    shapeTally[shape] = (shapeTally[shape] ?? 0) + 1;

    for (let view = 0; view < 3; view++) {
      const suffix = view === 0 ? "" : `-${view + 1}`;
      writeFileSync(
        `${dir}/${slug}${suffix}.svg`,
        svg({ productName: product.name, categoryName: category.name, shape, a, b, view })
      );
      files++;
    }
  }

  writeFileSync(
    `${dir}/_category.svg`,
    svg({
      productName: category.name,
      categoryName: "Professional Supplies",
      shape: shapeFor(category.products[0].name, category.slug),
      a, b, view: 0,
    })
  );
  files++;
}

console.log(`Generated ${files} product illustrations across ${CATALOG.length} categories.`);
console.log("Shape distribution:");
for (const [s, n] of Object.entries(shapeTally).sort((x, y) => y[1] - x[1])) {
  console.log(`  ${s.padEnd(16)} ${n} products`);
}
