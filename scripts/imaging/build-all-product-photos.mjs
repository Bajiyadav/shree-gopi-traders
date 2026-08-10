import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PUBLIC_PRODUCTS = path.join(process.cwd(), "public/products");

// Product shape visualizer configurations
const PRODUCT_STYLES = {
  // Bottles & Droppers
  "serum": { shape: "dropper", bodyColor: "#d97706", accent: "#fbbf24", label: "SERUM FORMULA" },
  "toner": { shape: "bottle", bodyColor: "#38bdf8", accent: "#7dd3fc", label: "HYDRATING TONER" },
  "rose-water": { shape: "spray", bodyColor: "#f472b6", accent: "#fbcfe8", label: "PURE ROSE WATER" },
  "disinfectant": { shape: "spray", bodyColor: "#22c55e", accent: "#86efac", label: "DISINFECTANT SPRAY" },
  "cleaner": { shape: "bottle", bodyColor: "#16a34a", accent: "#4ade80", label: "SALON CLEANER" },
  "sanitizer": { shape: "pump", bodyColor: "#0ea5e9", accent: "#38bdf8", label: "HAND SANITIZER" },
  "after-shave": { shape: "bottle", bodyColor: "#475569", accent: "#94a3b8", label: "AFTER SHAVE LOTION" },
  "beard-oil": { shape: "dropper", bodyColor: "#78350f", accent: "#d97706", label: "BEARD ESSENTIAL OIL" },
  "developer": { shape: "bottle", bodyColor: "#e2e8f0", accent: "#f59e0b", label: "CREME DEVELOPER" },

  // Jars & Tubs
  "scrub": { shape: "jar", bodyColor: "#92400e", accent: "#f59e0b", label: "EXFOLIATING SCRUB" },
  "cream": { shape: "jar", bodyColor: "#fbcfe8", accent: "#f472b6", label: "FACIAL MASSAGE CREAM" },
  "pack": { shape: "jar", bodyColor: "#065f46", accent: "#10b981", label: "HERBAL FACE PACK" },
  "moisturizer": { shape: "jar", bodyColor: "#e0f2fe", accent: "#0284c7", label: "DAILY MOISTURIZER" },
  "bleach": { shape: "jar", bodyColor: "#fef08a", accent: "#eab308", label: "BLEACH POWDER" },
  "acrylic": { shape: "jar", bodyColor: "#f3e8ff", accent: "#a855f7", label: "ACRYLIC SYSTEM" },

  // Tubes
  "cleanser": { shape: "tube", bodyColor: "#e0e7ff", accent: "#6366f1", label: "DEEP CLEANSER" },
  "smoothening": { shape: "tube", bodyColor: "#f1f5f9", accent: "#0f172a", label: "SMOOTHENING CREME" },
  "hair-color": { shape: "tube", bodyColor: "#64748b", accent: "#f59e0b", label: "PROFESSIONAL COLOR" },
  "concealer": { shape: "tube", bodyColor: "#fed7aa", accent: "#f97316", label: "HD CONCEALER" },
  "foundation": { shape: "bottle", bodyColor: "#fde68a", accent: "#d97706", label: "HD FOUNDATION" },

  // Facial & Treatment Kits (Boxes)
  "facial-kit": { shape: "box", bodyColor: "#fb7185", accent: "#e11d48", label: "FACIAL TREATMENT KIT" },
  "manicure-kit": { shape: "box", bodyColor: "#818cf8", accent: "#4f46e5", label: "MANICURE CARE KIT" },
  "pedicure-kit": { shape: "box", bodyColor: "#34d399", accent: "#059669", label: "PEDICURE CARE KIT" },
  "razor-blades": { shape: "box", bodyColor: "#0f172a", accent: "#f59e0b", label: "PLATINUM RAZOR BLADES" },
  "neck-strips": { shape: "box", bodyColor: "#ffffff", accent: "#38bdf8", label: "BARBER NECK STRIPS" },
  "cloths": { shape: "box", bodyColor: "#f8fafc", accent: "#0284c7", label: "DISPOSABLE CLOTHS" },

  // Scissors & Tools
  "scissors": { shape: "scissors", bodyColor: "#cbd5e1", accent: "#f59e0b", label: "JAPANESE STEEL" },
  "razor": { shape: "razor", bodyColor: "#0f172a", accent: "#cbd5e1", label: "STRAIGHT RAZOR" },
  "clipper": { shape: "clipper", bodyColor: "#1e293b", accent: "#f59e0b", label: "CORDLESS CLIPPER" },
  "trimmer": { shape: "clipper", bodyColor: "#0f172a", accent: "#3b82f6", label: "PRECISION TRIMMER" },
  "tools": { shape: "tools", bodyColor: "#94a3b8", accent: "#6366f1", label: "PRECISION STEEL" },

  // Electrical Machines
  "hair-dryer": { shape: "hairDryer", bodyColor: "#0f172a", accent: "#f59e0b", label: "IONIC DRYER" },
  "straightener": { shape: "flatIron", bodyColor: "#1e293b", accent: "#eab308", label: "CERAMIC FLAT IRON" },
  "curler": { shape: "flatIron", bodyColor: "#0f172a", accent: "#a855f7", label: "CURLING WAND" },
  "nail-lamp": { shape: "nailLamp", bodyColor: "#ffffff", accent: "#a855f7", label: "UV LED LAMP" },
  "steamer": { shape: "steamer", bodyColor: "#ffffff", accent: "#0ea5e9", label: "FACIAL STEAMER" },
  "sterilizer": { shape: "machine", bodyColor: "#ffffff", accent: "#3b82f6", label: "UV STERILIZER" },
  "cabinet": { shape: "machine", bodyColor: "#e2e8f0", accent: "#64748b", label: "HOT TOWEL CABINET" },
  "nail-drill": { shape: "machine", bodyColor: "#f1f5f9", accent: "#ec4899", label: "ELECTRIC NAIL DRILL" },

  // Furniture
  "chair": { shape: "chair", bodyColor: "#0f172a", accent: "#cbd5e1", label: "HYDRAULIC CHAIR" },
  "bed": { shape: "bed", bodyColor: "#ffffff", accent: "#6366f1", label: "FACIAL MASSAGE BED" },
  "shampoo-station": { shape: "chair", bodyColor: "#0f172a", accent: "#38bdf8", label: "SHAMPOO STATION" },
  "trolley": { shape: "trolley", bodyColor: "#334155", accent: "#94a3b8", label: "SALON TROLLEY" },
  "table": { shape: "trolley", bodyColor: "#f8fafc", accent: "#6366f1", label: "MANICURE TABLE" },

  // Cosmetics & Nails
  "lipstick": { shape: "lipstick", bodyColor: "#be123c", accent: "#fb7185", label: "MATTE LIPSTICK" },
  "mascara": { shape: "lipstick", bodyColor: "#0f172a", accent: "#38bdf8", label: "VOLUMIZING MASCARA" },
  "eyeliner": { shape: "lipstick", bodyColor: "#090d16", accent: "#f59e0b", label: "PRECISION EYELINER" },
  "palette": { shape: "palette", bodyColor: "#0f172a", accent: "#f43f5e", label: "PRO PALETTE" },
  "nail-polish": { shape: "polish", bodyColor: "#a855f7", accent: "#e9d5ff", label: "GEL POLISH" },
};

function getStyleForProduct(name, slug) {
  for (const [key, config] of Object.entries(PRODUCT_STYLES)) {
    if (slug.includes(key) || name.toLowerCase().includes(key)) return config;
  }
  // Generic fallbacks
  if (slug.includes("shampoo") || slug.includes("wash") || slug.includes("lotion")) {
    return { shape: "bottle", bodyColor: "#0284c7", accent: "#38bdf8", label: "SALON CARE" };
  }
  if (slug.includes("cream") || slug.includes("mask") || slug.includes("wax") || slug.includes("gel")) {
    return { shape: "jar", bodyColor: "#0f172a", accent: "#f59e0b", label: "PROFESSIONAL FORMULA" };
  }
  if (slug.includes("kit") || slug.includes("set") || slug.includes("pack")) {
    return { shape: "box", bodyColor: "#475569", accent: "#cbd5e1", label: "PROFESSIONAL SET" };
  }
  return { shape: "bottle", bodyColor: "#334155", accent: "#94a3b8", label: "PRO ESSENTIAL" };
}

function renderProductSvg(config, productName, slot = 1) {
  const { shape, bodyColor, accent, label } = config;
  const width = 1000;
  const height = 1000;

  let elements = "";

  if (shape === "dropper") {
    elements = `
      <ellipse cx="500" cy="780" rx="220" ry="35" fill="#0f172a" opacity="0.2" filter="blur(12px)"/>
      <g transform="translate(360, 240)">
        <rect x="0" y="160" width="280" height="420" rx="40" fill="url(#bodyGrad)"/>
        <rect x="0" y="160" width="280" height="420" rx="40" fill="url(#studioHighlight)" opacity="0.3"/>
        <rect x="30" y="260" width="220" height="240" rx="16" fill="#ffffff" opacity="0.95"/>
        <rect x="50" y="300" width="180" height="22" rx="11" fill="${accent}"/>
        <text x="140" y="380" font-family="sans-serif" font-weight="bold" font-size="16" fill="#0f172a" text-anchor="middle">${label}</text>
        <rect x="70" y="60" width="140" height="100" fill="#0f172a"/>
        <path d="M100 0h80a30 30 0 0 1 30 30v30h-140V30A30 30 0 0 1 100 0z" fill="#334155"/>
      </g>`;
  } else if (shape === "jar") {
    elements = `
      <ellipse cx="500" cy="760" rx="300" ry="40" fill="#0f172a" opacity="0.22" filter="blur(14px)"/>
      <g transform="translate(260, 320)">
        <rect x="0" y="140" width="480" height="340" rx="50" fill="url(#bodyGrad)"/>
        <rect x="0" y="140" width="480" height="340" rx="50" fill="url(#studioHighlight)" opacity="0.3"/>
        <rect x="-20" y="40" width="520" height="110" rx="30" fill="#0f172a"/>
        <rect x="-20" y="40" width="520" height="110" rx="30" fill="url(#studioHighlight)" opacity="0.2"/>
        <rect x="50" y="220" width="380" height="190" rx="20" fill="#ffffff" opacity="0.95"/>
        <rect x="80" y="260" width="320" height="28" rx="14" fill="${accent}"/>
        <text x="240" y="340" font-family="sans-serif" font-weight="bold" font-size="22" fill="#0f172a" text-anchor="middle">${label}</text>
      </g>`;
  } else if (shape === "tube") {
    elements = `
      <ellipse cx="500" cy="790" rx="200" ry="30" fill="#0f172a" opacity="0.2" filter="blur(12px)"/>
      <g transform="translate(360, 200)">
        <path d="M40 0h200l40 460H0z" fill="url(#bodyGrad)"/>
        <path d="M40 0h200l40 460H0z" fill="url(#studioHighlight)" opacity="0.3"/>
        <rect x="20" y="460" width="240" height="80" rx="20" fill="#0f172a"/>
        <rect x="40" y="140" width="200" height="240" rx="16" fill="#ffffff" opacity="0.95"/>
        <rect x="60" y="180" width="160" height="24" rx="12" fill="${accent}"/>
        <text x="140" y="260" font-family="sans-serif" font-weight="bold" font-size="16" fill="#0f172a" text-anchor="middle">${label}</text>
      </g>`;
  } else if (shape === "box") {
    elements = `
      <ellipse cx="500" cy="780" rx="340" ry="45" fill="#0f172a" opacity="0.2" filter="blur(14px)"/>
      <g transform="translate(240, 280)">
        <rect x="0" y="0" width="520" height="420" rx="30" fill="url(#bodyGrad)"/>
        <rect x="0" y="0" width="520" height="420" rx="30" fill="url(#studioHighlight)" opacity="0.25"/>
        <rect x="40" y="60" width="440" height="300" rx="20" fill="#ffffff" opacity="0.95"/>
        <rect x="70" y="100" width="380" height="36" rx="18" fill="${accent}"/>
        <text x="260" y="210" font-family="sans-serif" font-weight="bold" font-size="24" fill="#0f172a" text-anchor="middle">${label}</text>
      </g>`;
  } else if (shape === "scissors" || shape === "tools") {
    elements = `
      <ellipse cx="500" cy="780" rx="360" ry="40" fill="#0f172a" opacity="0.2" filter="blur(14px)"/>
      <g transform="translate(260, 240) rotate(-15)">
        <path d="M60 0l80 460M180 0l-80 460" stroke="url(#silverMetallic)" stroke-width="28" stroke-linecap="round"/>
        <circle cx="120" cy="220" r="20" fill="${accent}"/>
        <circle cx="60" cy="520" r="55" fill="none" stroke="url(#silverMetallic)" stroke-width="20"/>
        <circle cx="180" cy="520" r="55" fill="none" stroke="url(#silverMetallic)" stroke-width="20"/>
      </g>`;
  } else if (shape === "clipper") {
    elements = `
      <ellipse cx="500" cy="800" rx="220" ry="35" fill="#0f172a" opacity="0.22" filter="blur(12px)"/>
      <g transform="translate(360, 200)">
        <path d="M40 0h200c25 0 40 20 40 45v480c0 30-20 50-45 50H45c-25 0-45-20-45-50V45C0 20 15 0 40 0z" fill="url(#bodyGrad)"/>
        <rect x="25" y="-35" width="230" height="55" rx="10" fill="url(#silverMetallic)"/>
        ${Array.from({ length: 14 }).map((_, i) => `<rect x="${36 + i * 15}" y="-40" width="8" height="25" fill="#0f172a"/>`).join("")}
        <rect x="40" y="160" width="200" height="260" rx="20" fill="${accent}"/>
      </g>`;
  } else if (shape === "hairDryer") {
    elements = `
      <ellipse cx="500" cy="800" rx="340" ry="45" fill="#0f172a" opacity="0.2" filter="blur(15px)"/>
      <g transform="translate(200, 220)">
        <rect x="120" y="160" width="380" height="180" rx="90" fill="url(#bodyGrad)"/>
        <rect x="480" y="190" width="110" height="120" fill="#090d16"/>
        <circle cx="160" cy="250" r="75" fill="#0f172a"/>
        <circle cx="160" cy="250" r="65" fill="#1e293b" stroke="#334155" stroke-width="4"/>
        <path d="M300 320l-40 280c-4 28 16 52 44 52h24c28 0 48-24 44-52l-40-280z" fill="url(#bodyGrad)"/>
        <rect x="295" y="380" width="18" height="36" rx="6" fill="${accent}"/>
      </g>`;
  } else if (shape === "flatIron") {
    elements = `
      <ellipse cx="500" cy="780" rx="340" ry="40" fill="#0f172a" opacity="0.2" filter="blur(14px)"/>
      <g transform="translate(180, 480) rotate(-20)">
        <path d="M0 40h600c25 0 45 20 45 45s-20 45-45 45H0z" fill="url(#bodyGrad)"/>
        <rect x="240" y="50" width="260" height="26" rx="6" fill="${accent}"/>
        <rect x="240" y="84" width="260" height="26" rx="6" fill="${accent}"/>
      </g>`;
  } else if (shape === "machine" || shape === "steamer" || shape === "nailLamp") {
    elements = `
      <ellipse cx="500" cy="800" rx="360" ry="45" fill="#0f172a" opacity="0.2" filter="blur(15px)"/>
      <g transform="translate(240, 260)">
        <rect x="0" y="100" width="520" height="380" rx="50" fill="url(#bodyGrad)"/>
        <rect x="0" y="100" width="520" height="380" rx="50" fill="url(#studioHighlight)" opacity="0.3"/>
        <rect x="60" y="180" width="400" height="220" rx="20" fill="#ffffff" opacity="0.95"/>
        <circle cx="160" cy="290" r="50" fill="${accent}"/>
        <rect x="250" y="260" width="180" height="20" rx="10" fill="#334155"/>
        <rect x="250" y="300" width="120" height="16" rx="8" fill="#64748b"/>
      </g>`;
  } else if (shape === "chair" || shape === "bed" || shape === "trolley") {
    elements = `
      <ellipse cx="500" cy="840" rx="340" ry="45" fill="#0f172a" opacity="0.22" filter="blur(14px)"/>
      <ellipse cx="500" cy="800" rx="260" ry="45" fill="url(#silverMetallic)"/>
      <rect x="465" y="620" width="70" height="180" rx="16" fill="url(#silverMetallic)"/>
      <g transform="translate(260, 240)">
        <rect x="0" y="240" width="480" height="150" rx="30" fill="url(#bodyGrad)"/>
        <path d="M40 0h400c25 0 40 20 40 45v200H0V45C0 20 15 0 40 0z" fill="url(#bodyGrad)"/>
        <rect x="140" y="-80" width="200" height="90" rx="20" fill="url(#bodyGrad)"/>
      </g>`;
  } else if (shape === "lipstick" || shape === "polish" || shape === "palette") {
    elements = `
      <ellipse cx="500" cy="780" rx="300" ry="40" fill="#0f172a" opacity="0.2" filter="blur(14px)"/>
      <g transform="translate(320, 280)">
        <rect x="0" y="0" width="360" height="420" rx="30" fill="url(#bodyGrad)"/>
        <rect x="30" y="30" width="300" height="360" rx="20" fill="#ffffff" opacity="0.95"/>
        <rect x="60" y="80" width="240" height="32" rx="16" fill="${accent}"/>
        <text x="180" y="200" font-family="sans-serif" font-weight="bold" font-size="22" fill="#0f172a" text-anchor="middle">${label}</text>
      </g>`;
  } else {
    // Standard Bottle default
    elements = `
      <ellipse cx="500" cy="780" rx="260" ry="40" fill="#0f172a" opacity="0.2" filter="blur(14px)"/>
      <g transform="translate(320, 220)">
        <rect x="0" y="180" width="360" height="420" rx="50" fill="url(#bodyGrad)"/>
        <rect x="0" y="180" width="360" height="420" rx="50" fill="url(#studioHighlight)" opacity="0.3"/>
        <rect x="40" y="280" width="280" height="240" rx="20" fill="#ffffff" opacity="0.95"/>
        <rect x="70" y="320" width="220" height="28" rx="14" fill="${accent}"/>
        <text x="180" y="410" font-family="sans-serif" font-weight="bold" font-size="20" fill="#0f172a" text-anchor="middle">${label}</text>
        <rect x="110" y="80" width="140" height="100" fill="#0f172a"/>
        <rect x="80" y="0" width="200" height="80" rx="20" fill="#334155"/>
      </g>`;
  }

  // Perspective angle transformation per slot
  let slotTransform = "";
  let badgeText = "FRONT VIEW";
  if (slot === 2) {
    slotTransform = `transform="translate(500, 500) rotate(8) scale(1.06) translate(-500, -510)"`;
    badgeText = "DETAIL ANGLE";
  } else if (slot === 3) {
    slotTransform = `transform="translate(500, 500) rotate(-8) scale(1.08) translate(-500, -490)"`;
    badgeText = "SIDE PERSPECTIVE";
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="studioGround" cx="${slot === 2 ? "45%" : slot === 3 ? "55%" : "50%"}" cy="40%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="65%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </radialGradient>
    <linearGradient id="studioHighlight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bodyColor}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="silverMetallic" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="30%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#studioGround)"/>
  <line x1="0" y1="740" x2="${width}" y2="740" stroke="#94a3b8" stroke-width="1.5" opacity="0.4"/>
  <g ${slotTransform}>
    ${elements}
  </g>
</svg>`;

  return Buffer.from(svg);
}

async function main() {
  console.log("=== Generating Multi-Angle Studio PNG Photos (3 Unique Angles per Product) for ALL 125 Products ===");

  const products = await prisma.product.findMany({
    select: { name: true, slug: true, images: true, category: { select: { slug: true, name: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }]
  });

  let createdCount = 0;

  for (const p of products) {
    const catDir = path.join(PUBLIC_PRODUCTS, p.category.slug);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

    const primaryPng = path.join(catDir, `${p.slug}.png`);
    const png2 = path.join(catDir, `${p.slug}-2.png`);
    const png3 = path.join(catDir, `${p.slug}-3.png`);

    const config = getStyleForProduct(p.name, p.slug);

    const svgBuf1 = renderProductSvg(config, p.name, 1);
    const svgBuf2 = renderProductSvg(config, p.name, 2);
    const svgBuf3 = renderProductSvg(config, p.name, 3);

    await sharp(svgBuf1).png().toFile(primaryPng);
    await sharp(svgBuf2).png().toFile(png2);
    await sharp(svgBuf3).png().toFile(png3);

    createdCount++;
    console.log(`Created 3 multi-angle PNG studio photos for: ${p.name} (${p.category.name})`);
  }

  console.log(`\nGenerated 3 unique multi-angle PNG studio photos for all ${createdCount} products (Total: ${createdCount * 3} images).`);
}

main().catch(console.error);
