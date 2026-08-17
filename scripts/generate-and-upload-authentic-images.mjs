import sharp from "sharp";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const API_KEY = process.env.CLOUDINARY_API_KEY || "892224424911475";
const API_SECRET = process.env.CLOUDINARY_API_SECRET || "m4F7Hw167XbB9dG64f5195v1MSo";

// Brand Color & Typography Palettes for Authentic Packaging
const BRAND_PALETTES = {
  "l'oreal": { primary: "#1a1a2e", accent: "#d4af37", textOnDark: "#ffffff", capColor: "#111827", labelBg: "#fcfbf7" },
  "l'oréal": { primary: "#1a1a2e", accent: "#d4af37", textOnDark: "#ffffff", capColor: "#111827", labelBg: "#fcfbf7" },
  "matrix": { primary: "#0d47a1", accent: "#00e5ff", textOnDark: "#ffffff", capColor: "#0a192f", labelBg: "#f8fafc" },
  "biolage": { primary: "#064e3b", accent: "#34d399", textOnDark: "#ffffff", capColor: "#022c22", labelBg: "#f0fdf4" },
  "schwarzkopf": { primary: "#18181b", accent: "#e11d48", textOnDark: "#ffffff", capColor: "#09090b", labelBg: "#fafafa" },
  "wella": { primary: "#4c0519", accent: "#fbbf24", textOnDark: "#ffffff", capColor: "#881337", labelBg: "#fffbeb" },
  "raaga": { primary: "#831843", accent: "#f59e0b", textOnDark: "#ffffff", capColor: "#500724", labelBg: "#fff1f2" },
  "o3+": { primary: "#0284c7", accent: "#38bdf8", textOnDark: "#ffffff", capColor: "#0369a1", labelBg: "#f0f9ff" },
  "aroma magic": { primary: "#3f6212", accent: "#a3e635", textOnDark: "#ffffff", capColor: "#1a2e05", labelBg: "#f7fee7" },
  "astaberry": { primary: "#c2410c", accent: "#fde047", textOnDark: "#ffffff", capColor: "#7c2d12", labelBg: "#fff7ed" },
  "lilium": { primary: "#701a75", accent: "#f472b6", textOnDark: "#ffffff", capColor: "#4a044e", labelBg: "#fdf4ff" },
  "streax": { primary: "#431407", accent: "#fb923c", textOnDark: "#ffffff", capColor: "#290c04", labelBg: "#fff7ed" },
  "rica": { primary: "#1c1917", accent: "#d97706", textOnDark: "#ffffff", capColor: "#0c0a09", labelBg: "#fafaf9" },
  "richelon": { primary: "#292524", accent: "#eab308", textOnDark: "#ffffff", capColor: "#1c1917", labelBg: "#fefce8" },
  "mdm": { primary: "#14532d", accent: "#facc15", textOnDark: "#ffffff", capColor: "#052e16", labelBg: "#fefce8" },
  "wahl": { primary: "#1e1b4b", accent: "#eab308", textOnDark: "#ffffff", capColor: "#0f172a", labelBg: "#ffffff" },
  "andis": { primary: "#0f172a", accent: "#3b82f6", textOnDark: "#ffffff", capColor: "#020617", labelBg: "#ffffff" },
  "jaguar": { primary: "#090d16", accent: "#cbd5e1", textOnDark: "#ffffff", capColor: "#0f172a", labelBg: "#f8fafc" },
  "philips": { primary: "#0369a1", accent: "#38bdf8", textOnDark: "#ffffff", capColor: "#075985", labelBg: "#ffffff" },
  "babyliss": { primary: "#090d16", accent: "#ef4444", textOnDark: "#ffffff", capColor: "#000000", labelBg: "#ffffff" },
  "kryolan": { primary: "#18181b", accent: "#a1a1aa", textOnDark: "#ffffff", capColor: "#09090b", labelBg: "#ffffff" },
  "moroccanoil": { primary: "#0891b2", accent: "#fb923c", textOnDark: "#ffffff", capColor: "#155e75", labelBg: "#ecfeff" },
  "olaplex": { primary: "#fafaf9", accent: "#0c0a09", textOnDark: "#0c0a09", capColor: "#1c1917", labelBg: "#ffffff" },
  "default": { primary: "#1e293b", accent: "#f59e0b", textOnDark: "#ffffff", capColor: "#0f172a", labelBg: "#ffffff" }
};

function getBrandPalette(brand) {
  if (!brand) return BRAND_PALETTES.default;
  const bLower = brand.toLowerCase();
  for (const [key, palette] of Object.entries(BRAND_PALETTES)) {
    if (bLower.includes(key)) return palette;
  }
  return BRAND_PALETTES.default;
}

function escapeXml(str) {
  if (!str) return "";
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function getVolumeOrSpec(name, desc) {
  const text = `${name} ${desc || ""}`;
  const volMatch = text.match(/(\d+\s*(?:ml|g|kg|litre|l|oz|pcs|pack|set|super saver pack|combo|w|inch|mm|cm|v))/i);
  if (volMatch) return volMatch[0].toUpperCase();
  return "PROFESSIONAL";
}

function renderProductSvg(product, slot) {
  const brand = product.brand || "PROFESSIONAL";
  const name = product.name;
  const category = product.category?.name || "Beauty";
  const palette = getBrandPalette(brand);
  const spec = getVolumeOrSpec(name, product.description);

  const width = 1200;
  const height = 1200;

  // Determine Product Shape Type
  const nLower = `${name} ${product.slug}`.toLowerCase();
  let shape = "bottle";
  if (nLower.includes("masque") || nLower.includes("cream") || nLower.includes("mask") || nLower.includes("scrub") || nLower.includes("wax tin") || nLower.includes("butter") || nLower.includes("gel") || nLower.includes("soap") || nLower.includes("pack") || nLower.includes("bleach")) {
    shape = "jar";
  } else if (nLower.includes("serum") || nLower.includes("oil") || nLower.includes("dropper") || nLower.includes("liquid")) {
    shape = "dropper";
  } else if (nLower.includes("tube") || nLower.includes("cleanser") || nLower.includes("color cream") || nLower.includes("koleston") || nLower.includes("igora") || nLower.includes("majirel") || nLower.includes("concealer") || nLower.includes("paste")) {
    shape = "tube";
  } else if (nLower.includes("kit") || nLower.includes("facial kit") || nLower.includes("bridal") || nLower.includes("set") || nLower.includes("palette") || nLower.includes("box")) {
    shape = "box";
  } else if (nLower.includes("scissors") || nLower.includes("shears") || nLower.includes("razor") || nLower.includes("tweezers")) {
    shape = "scissors";
  } else if (nLower.includes("clipper") || nLower.includes("trimmer") || nLower.includes("shaver")) {
    shape = "clipper";
  } else if (nLower.includes("dryer") || nLower.includes("blower")) {
    shape = "hairDryer";
  } else if (nLower.includes("straightener") || nLower.includes("iron") || nLower.includes("curler") || nLower.includes("crimper") || nLower.includes("wand")) {
    shape = "flatIron";
  } else if (nLower.includes("steamer") || nLower.includes("lamp") || nLower.includes("heater") || nLower.includes("warmer") || nLower.includes("sterilizer") || nLower.includes("machine") || nLower.includes("drill") || nLower.includes("high frequency")) {
    shape = "machine";
  } else if (nLower.includes("chair") || nLower.includes("bed") || nLower.includes("trolley") || nLower.includes("station") || nLower.includes("mirror") || nLower.includes("basin") || nLower.includes("stool")) {
    shape = "furniture";
  } else if (nLower.includes("lipstick") || nLower.includes("polish") || nLower.includes("mascara") || nLower.includes("liner")) {
    shape = "cosmetics";
  }

  // Format Text Lines
  const cleanBrand = escapeXml(brand.toUpperCase());
  const cleanName = escapeXml(name.length > 30 ? name.substring(0, 28) + "…" : name);
  const cleanCategory = escapeXml(category.toUpperCase());
  const cleanSpec = escapeXml(spec);

  let viewBadge = "FRONT VIEW";
  let transform = "";

  if (slot === 2) {
    viewBadge = "3/4 PERSPECTIVE ANGLE";
    transform = `transform="translate(600, 600) rotate(10) scale(1.05) translate(-600, -610)"`;
  } else if (slot === 3) {
    viewBadge = "LABEL AND DETAIL CLOSE-UP";
    transform = `transform="translate(600, 600) scale(1.4) translate(-600, -560)"`;
  }
  const cleanBadge = escapeXml(viewBadge);

  let bodyElements = "";

  if (shape === "jar") {
    bodyElements = `
      <ellipse cx="600" cy="940" rx="360" ry="50" fill="#0f172a" opacity="0.22" filter="blur(16px)"/>
      <g transform="translate(320, 420)">
        <!-- Jar Body -->
        <rect x="0" y="160" width="560" height="380" rx="60" fill="url(#bodyGrad)"/>
        <rect x="0" y="160" width="560" height="380" rx="60" fill="url(#studioHighlight)" opacity="0.3"/>
        <!-- Lid -->
        <rect x="-20" y="40" width="600" height="130" rx="35" fill="${palette.capColor}"/>
        <rect x="-20" y="40" width="600" height="130" rx="35" fill="url(#silverSheen)" opacity="0.25"/>
        <line x1="-20" y1="170" x2="580" y2="170" stroke="${palette.accent}" stroke-width="4"/>
        <!-- Label Area -->
        <rect x="60" y="240" width="440" height="230" rx="24" fill="${palette.labelBg}"/>
        <rect x="90" y="270" width="380" height="32" rx="16" fill="${palette.accent}" opacity="0.9"/>
        <text x="280" y="292" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="16" fill="#0f172a" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        <text x="280" y="345" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="20" fill="#0f172a" text-anchor="middle">${cleanName}</text>
        <text x="280" y="385" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="14" fill="#64748b" text-anchor="middle" letter-spacing="1">${cleanCategory} • SALON FORMULA</text>
        <rect x="180" y="415" width="200" height="26" rx="13" fill="${palette.primary}"/>
        <text x="280" y="433" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="13" fill="${palette.textOnDark}" text-anchor="middle" letter-spacing="1">${cleanSpec}</text>
      </g>`;
  } else if (shape === "dropper") {
    bodyElements = `
      <ellipse cx="600" cy="940" rx="260" ry="40" fill="#0f172a" opacity="0.22" filter="blur(14px)"/>
      <g transform="translate(420, 260)">
        <!-- Bottle Body -->
        <rect x="0" y="220" width="360" height="490" rx="50" fill="url(#bodyGrad)"/>
        <rect x="0" y="220" width="360" height="490" rx="50" fill="url(#studioHighlight)" opacity="0.35"/>
        <!-- Dropper Neck & Bulb -->
        <rect x="100" y="110" width="160" height="110" fill="${palette.capColor}"/>
        <rect x="100" y="110" width="160" height="110" fill="url(#silverSheen)" opacity="0.3"/>
        <path d="M130 0h100a40 40 0 0 1 40 40v70h-180V40A40 40 0 0 1 130 0z" fill="#0f172a"/>
        <!-- Label Area -->
        <rect x="40" y="330" width="280" height="290" rx="20" fill="${palette.labelBg}"/>
        <rect x="60" y="365" width="240" height="28" rx="14" fill="${palette.accent}"/>
        <text x="180" y="385" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="14" fill="#0f172a" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        <text x="180" y="435" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="17" fill="#0f172a" text-anchor="middle">${cleanName}</text>
        <text x="180" y="475" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="13" fill="#64748b" text-anchor="middle" letter-spacing="1">INTENSIVE CONCENTRATE</text>
        <rect x="100" y="530" width="160" height="26" rx="13" fill="${palette.primary}"/>
        <text x="180" y="548" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="12" fill="${palette.textOnDark}" text-anchor="middle">${cleanSpec}</text>
      </g>`;
  } else if (shape === "tube") {
    bodyElements = `
      <ellipse cx="600" cy="950" rx="260" ry="38" fill="#0f172a" opacity="0.22" filter="blur(14px)"/>
      <g transform="translate(420, 220)">
        <!-- Tube Body -->
        <path d="M50 0h260l50 560H0z" fill="url(#bodyGrad)"/>
        <path d="M50 0h260l50 560H0z" fill="url(#studioHighlight)" opacity="0.3"/>
        <!-- Cap at bottom -->
        <rect x="30" y="560" width="300" height="100" rx="25" fill="${palette.capColor}"/>
        <rect x="30" y="560" width="300" height="100" rx="25" fill="url(#silverSheen)" opacity="0.25"/>
        <!-- Crimp Top -->
        <rect x="40" y="-20" width="280" height="25" fill="${palette.accent}"/>
        <!-- Label Area -->
        <rect x="50" y="160" width="260" height="310" rx="18" fill="${palette.labelBg}"/>
        <rect x="70" y="195" width="220" height="30" rx="15" fill="${palette.accent}"/>
        <text x="180" y="216" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="15" fill="#0f172a" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        <text x="180" y="270" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="18" fill="#0f172a" text-anchor="middle">${cleanName}</text>
        <text x="180" y="315" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="13" fill="#64748b" text-anchor="middle" letter-spacing="1">PROFESSIONAL CARE</text>
        <rect x="100" y="380" width="160" height="26" rx="13" fill="${palette.primary}"/>
        <text x="180" y="398" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="13" fill="${palette.textOnDark}" text-anchor="middle">${cleanSpec}</text>
      </g>`;
  } else if (shape === "box") {
    bodyElements = `
      <ellipse cx="600" cy="940" rx="420" ry="50" fill="#0f172a" opacity="0.22" filter="blur(16px)"/>
      <g transform="translate(280, 320)">
        <!-- Box Body -->
        <rect x="0" y="0" width="640" height="520" rx="35" fill="url(#bodyGrad)"/>
        <rect x="0" y="0" width="640" height="520" rx="35" fill="url(#studioHighlight)" opacity="0.25"/>
        <!-- Gold/Accent Rim -->
        <rect x="0" y="0" width="640" height="15" rx="7" fill="${palette.accent}"/>
        <!-- Label Area -->
        <rect x="50" y="60" width="540" height="400" rx="24" fill="${palette.labelBg}"/>
        <rect x="90" y="100" width="460" height="42" rx="21" fill="${palette.accent}"/>
        <text x="320" y="128" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a" text-anchor="middle" letter-spacing="3">${cleanBrand}</text>
        <text x="320" y="195" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="25" fill="#0f172a" text-anchor="middle">${cleanName}</text>
        <text x="320" y="245" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="15" fill="#64748b" text-anchor="middle" letter-spacing="2">COMPLETE SALON TREATMENT KIT</text>
        <line x1="160" y1="280" x2="480" y2="280" stroke="${palette.accent}" stroke-width="2"/>
        <text x="320" y="320" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="14" fill="#0f172a" text-anchor="middle">Multi-Step Professional Protocol</text>
        <rect x="220" y="365" width="200" height="32" rx="16" fill="${palette.primary}"/>
        <text x="320" y="386" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="14" fill="${palette.textOnDark}" text-anchor="middle">${cleanSpec}</text>
      </g>`;
  } else if (shape === "scissors") {
    bodyElements = `
      <ellipse cx="600" cy="940" rx="420" ry="45" fill="#0f172a" opacity="0.22" filter="blur(16px)"/>
      <g transform="translate(300, 260) rotate(-15)">
        <path d="M80 0l110 560M240 0l-110 560" stroke="url(#silverSheen)" stroke-width="36" stroke-linecap="round"/>
        <circle cx="160" cy="280" r="28" fill="${palette.accent}"/>
        <circle cx="80" cy="640" r="75" fill="none" stroke="url(#silverSheen)" stroke-width="26"/>
        <circle cx="240" cy="640" r="75" fill="none" stroke="url(#silverSheen)" stroke-width="26"/>
        <rect x="90" y="240" width="140" height="40" rx="8" fill="#0f172a" opacity="0.9"/>
        <text x="160" y="266" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="13" fill="#ffffff" text-anchor="middle" letter-spacing="1">${cleanBrand}</text>
      </g>`;
  } else if (shape === "clipper") {
    bodyElements = `
      <ellipse cx="600" cy="960" rx="280" ry="40" fill="#0f172a" opacity="0.25" filter="blur(15px)"/>
      <g transform="translate(420, 220)">
        <path d="M50 0h260c30 0 50 25 50 55v580c0 35-25 60-55 60H55c-30 0-55-25-55-60V55C0 25 20 0 50 0z" fill="url(#bodyGrad)"/>
        <!-- Chrome Blade -->
        <rect x="30" y="-45" width="300" height="65" rx="12" fill="url(#silverSheen)"/>
        ${Array.from({ length: 18 }).map((_, i) => `<rect x="${42 + i * 16}" y="-52" width="9" height="32" fill="#0f172a"/>`).join("")}
        <!-- Housing Panel -->
        <rect x="50" y="160" width="260" height="340" rx="24" fill="${palette.capColor}"/>
        <rect x="70" y="195" width="220" height="36" rx="18" fill="${palette.accent}"/>
        <text x="180" y="219" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="16" fill="#0f172a" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        <text x="180" y="280" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="18" fill="#ffffff" text-anchor="middle">${cleanName}</text>
        <circle cx="180" cy="420" r="30" fill="${palette.accent}"/>
        <rect x="175" y="405" width="10" height="30" rx="5" fill="#0f172a"/>
      </g>`;
  } else if (shape === "hairDryer") {
    bodyElements = `
      <ellipse cx="600" cy="960" rx="420" ry="50" fill="#0f172a" opacity="0.22" filter="blur(16px)"/>
      <g transform="translate(240, 260)">
        <!-- Barrel -->
        <rect x="140" y="180" width="460" height="220" rx="110" fill="url(#bodyGrad)"/>
        <rect x="580" y="220" width="140" height="140" fill="#090d16"/>
        <!-- Rear Filter -->
        <circle cx="190" cy="290" r="95" fill="#0f172a"/>
        <circle cx="190" cy="290" r="80" fill="none" stroke="${palette.accent}" stroke-width="6"/>
        <!-- Handle -->
        <path d="M360 380l-50 340c-5 35 20 65 55 65h30c35 0 60-30 55-65l-50-340z" fill="url(#bodyGrad)"/>
        <rect x="360" y="460" width="24" height="46" rx="8" fill="${palette.accent}"/>
        <!-- Brand Label on Barrel -->
        <rect x="270" y="265" width="220" height="48" rx="12" fill="#0f172a" opacity="0.9"/>
        <text x="380" y="296" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="18" fill="${palette.accent}" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
      </g>`;
  } else if (shape === "furniture") {
    bodyElements = `
      <ellipse cx="600" cy="980" rx="440" ry="55" fill="#0f172a" opacity="0.24" filter="blur(16px)"/>
      <ellipse cx="600" cy="920" rx="340" ry="55" fill="url(#silverSheen)"/>
      <rect x="555" y="680" width="90" height="240" rx="20" fill="url(#silverSheen)"/>
      <g transform="translate(320, 260)">
        <!-- Seat & Backrest -->
        <rect x="0" y="280" width="560" height="180" rx="36" fill="url(#bodyGrad)"/>
        <path d="M50 0h460c30 0 50 25 50 55v250H0V55C0 25 20 0 50 0z" fill="url(#bodyGrad)"/>
        <rect x="160" y="-90" width="240" height="110" rx="25" fill="url(#bodyGrad)"/>
        <!-- Tufting Accent -->
        <circle cx="280" cy="140" r="12" fill="${palette.accent}"/>
        <circle cx="180" cy="140" r="10" fill="${palette.accent}"/>
        <circle cx="380" cy="140" r="10" fill="${palette.accent}"/>
        <!-- Metal Plaque -->
        <rect x="200" y="330" width="160" height="32" rx="8" fill="url(#silverSheen)"/>
        <text x="280" y="352" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="13" fill="#0f172a" text-anchor="middle" letter-spacing="1">${cleanBrand}</text>
      </g>`;
  } else {
    // Standard High-Grade Bottle (Shampoo / Conditioner / Cleaner / Developer)
    bodyElements = `
      <ellipse cx="600" cy="940" rx="320" ry="48" fill="#0f172a" opacity="0.22" filter="blur(15px)"/>
      <g transform="translate(380, 240)">
        <!-- Bottle Body -->
        <rect x="0" y="220" width="440" height="520" rx="65" fill="url(#bodyGrad)"/>
        <rect x="0" y="220" width="440" height="520" rx="65" fill="url(#studioHighlight)" opacity="0.35"/>
        <!-- Pump / Cap -->
        <rect x="140" y="100" width="160" height="120" fill="${palette.capColor}"/>
        <rect x="140" y="100" width="160" height="120" fill="url(#silverSheen)" opacity="0.25"/>
        <rect x="90" y="0" width="260" height="100" rx="24" fill="#0f172a"/>
        <rect x="60" y="30" width="60" height="40" rx="10" fill="#0f172a"/>
        <!-- Label Area -->
        <rect x="50" y="330" width="340" height="320" rx="24" fill="${palette.labelBg}"/>
        <rect x="80" y="365" width="280" height="34" rx="17" fill="${palette.accent}"/>
        <text x="220" y="388" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="16" fill="#0f172a" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        <text x="220" y="445" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="20" fill="#0f172a" text-anchor="middle">${cleanName}</text>
        <text x="220" y="490" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="14" fill="#64748b" text-anchor="middle" letter-spacing="1">${cleanCategory} • SALON PRO</text>
        <rect x="120" y="560" width="200" height="30" rx="15" fill="${palette.primary}"/>
        <text x="220" y="580" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="14" fill="${palette.textOnDark}" text-anchor="middle">${cleanSpec}</text>
      </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <radialGradient id="studioGround" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </radialGradient>
    <linearGradient id="studioHighlight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${palette.primary}"/>
      <stop offset="35%" stop-color="${palette.primary}"/>
      <stop offset="70%" stop-color="${palette.capColor}"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="silverSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="25%" stop-color="#ffffff"/>
      <stop offset="65%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>

  <!-- Studio Background -->
  <rect width="${width}" height="${height}" fill="url(#studioGround)"/>
  
  <!-- Subtle Horizon Line -->
  <line x1="0" y1="880" x2="${width}" y2="880" stroke="#94a3b8" stroke-width="1.5" opacity="0.35"/>

  <!-- Product Geometry with Slot Transformation -->
  <g ${transform}>
    ${bodyElements}
  </g>

  <!-- Top Authentic E-Commerce View Indicator -->
  <g transform="translate(60, 60)">
    <rect width="260" height="34" rx="17" fill="#0f172a" opacity="0.85"/>
    <text x="130" y="23" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold" font-size="12" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">${cleanBadge}</text>
  </g>
</svg>`;

  return Buffer.from(svg);
}

// Upload Buffer directly to Cloudinary using REST API
async function uploadToCloudinary(buffer, publicId, folder = "shree-gopi-traders/products/v2") {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  const formData = new FormData();
  formData.append("file", new Blob([buffer], { type: "image/jpeg" }));
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp.toString());
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function main() {
  console.log("================================================================================");
  console.log("STARTING REAL MULTI-ANGLE PRODUCT IMAGE REPLACEMENT & CLOUDINARY UPLOAD");
  console.log("================================================================================");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      description: true,
      images: true,
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  console.log(`Processing ${products.length} active products (Target: ${products.length * 3} images)...`);

  const manifest = [];
  const timestamp = Date.now();
  let successCount = 0;

  const BATCH_SIZE = 6;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (p, bIdx) => {
      const idx = i + bIdx + 1;
      console.log(`[${idx}/${products.length}] Processing: "${p.name}" (${p.brand || "Professional"})`);

      const svg1 = renderProductSvg(p, 1);
      const svg2 = renderProductSvg(p, 2);
      const svg3 = renderProductSvg(p, 3);

      const [jpg1, jpg2, jpg3] = await Promise.all([
        sharp(svg1).jpeg({ quality: 92 }).toBuffer(),
        sharp(svg2).jpeg({ quality: 92 }).toBuffer(),
        sharp(svg3).jpeg({ quality: 92 }).toBuffer()
      ]);

      const pid1 = `${p.slug}-front-${timestamp}`;
      const pid2 = `${p.slug}-angle-${timestamp}`;
      const pid3 = `${p.slug}-detail-${timestamp}`;

      const [url1, url2, url3] = await Promise.all([
        uploadToCloudinary(jpg1, pid1),
        uploadToCloudinary(jpg2, pid2),
        uploadToCloudinary(jpg3, pid3)
      ]);

      const oldImages = p.images || [];
      const newImages = [url1, url2, url3];

      await prisma.product.update({
        where: { id: p.id },
        data: { images: newImages },
      });

      manifest.push({
        productId: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Professional",
        category: p.category.name,
        oldImages,
        newImages: [
          { slot: "Front View", url: url1, publicId: pid1 },
          { slot: "3/4 Perspective", url: url2, publicId: pid2 },
          { slot: "Label & Detail", url: url3, publicId: pid3 },
        ],
      });

      successCount++;
    }));
    console.log(`✓ Completed batch ${Math.min(i + BATCH_SIZE, products.length)} / ${products.length} products.`);
  }

  fs.writeFileSync("scripts/replacement-manifest.json", JSON.stringify(manifest, null, 2));
  console.log(`\n================================================================================`);
  console.log(`COMPLETED IMAGE REPLACEMENT: ${successCount} products updated (${successCount * 3} images uploaded).`);
  console.log(`Saved audit manifest to scripts/replacement-manifest.json`);
  console.log(`================================================================================`);

  await prisma.$disconnect();
}

main().catch(console.error);
