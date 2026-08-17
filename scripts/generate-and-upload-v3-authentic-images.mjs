import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function loadEnv() {
  const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
  const env = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const API_KEY = env.CLOUDINARY_API_KEY || "295259549445344";
const API_SECRET = env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("Missing Cloudinary credentials");
  process.exit(1);
}

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + API_SECRET).digest("hex");
}

async function uploadBufferToCloudinary(buffer, publicId) {
  const folder = "shree-gopi-traders/products/v3";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = {
    folder,
    overwrite: "true",
    public_id: publicId,
    timestamp,
  };
  const signature = sign(paramsToSign);

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "image/png" }), `${publicId}.png`);
  form.append("api_key", API_KEY);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} - ${err}`);
  }

  const json = await res.json();
  return json.secure_url;
}

// Brand color and packaging palette mapping
function getBrandVisualTheme(brand, name, categorySlug) {
  const b = brand.toLowerCase();
  const n = name.toLowerCase();

  // MDM Herbal Products
  if (b.includes("mdm") || n.includes("mdm")) {
    if (n.includes("manjistha")) {
      return {
        brandName: "MDM HERBAL",
        bodyColor: "#881337",
        bodyGrad2: "#4c0519",
        accentColor: "#f43f5e",
        labelBg: "#fff1f2",
        textColor: "#881337",
        containerType: "soap-box",
        subTitle: "MANJISTHA AYURVEDIC SOAP",
        badge: "100% PURE AYURVEDIC",
        volume: "100g x 6 Bars"
      };
    }
    if (n.includes("saffron")) {
      return {
        brandName: "MDM HERBAL",
        bodyColor: "#c2410c",
        bodyGrad2: "#7c2d12",
        accentColor: "#fbbf24",
        labelBg: "#fffbeb",
        textColor: "#9a3412",
        containerType: "soap-box",
        subTitle: "MULIKAA MY SAFFRON SOAP",
        badge: "KESAR & SUVARNA PINDI",
        volume: "150g Luxury Bar"
      };
    }
    if (n.includes("neem") || n.includes("aloe")) {
      return {
        brandName: "MDM HERBAL",
        bodyColor: "#14532d",
        bodyGrad2: "#052e16",
        accentColor: "#22c55e",
        labelBg: "#f0fdf4",
        textColor: "#14532d",
        containerType: "soap-box",
        subTitle: "NEEM ALOE VERA PURIFYING SOAP",
        badge: "NATURAL HERBAL CARE",
        volume: "100g x 8 Bars"
      };
    }
    if (n.includes("vana") || n.includes("shampoo")) {
      return {
        brandName: "MDM HERBAL",
        bodyColor: "#064e3b",
        bodyGrad2: "#022c22",
        accentColor: "#10b981",
        labelBg: "#ecfdf5",
        textColor: "#064e3b",
        containerType: "bottle",
        subTitle: "VANA HERBAL SHAMPOO",
        badge: "NATURAL AYURVEDIC FORMULA",
        volume: "300 ml"
      };
    }
    if (n.includes("mulika") || n.includes("oil")) {
      return {
        brandName: "MDM HERBAL",
        bodyColor: "#78350f",
        bodyGrad2: "#451a03",
        accentColor: "#d97706",
        labelBg: "#fef3c7",
        textColor: "#78350f",
        containerType: "dropper",
        subTitle: "MULIKA HERBAL HAIR OIL",
        badge: "100% PURE BOTANICALS",
        volume: "200 ml"
      };
    }
  }

  // Major Haircare Brands
  if (b.includes("l'oreal") || b.includes("l’oréal") || b.includes("loreal")) {
    return {
      brandName: "L'ORÉAL PROFESSIONNEL",
      bodyColor: "#1e1b4b",
      bodyGrad2: "#0f172a",
      accentColor: "#eab308",
      labelBg: "#ffffff",
      textColor: "#0f172a",
      containerType: n.includes("masque") || n.includes("mask") ? "jar" : "bottle",
      subTitle: n.includes("absolut") ? "SERIE EXPERT ABSOLUT REPAIR" : "PROFESSIONNEL PARIS",
      badge: "SALON EXPERT FORMULA",
      volume: "500 ml"
    };
  }

  if (b.includes("matrix")) {
    return {
      brandName: "MATRIX",
      bodyColor: "#ea580c",
      bodyGrad2: "#9a3412",
      accentColor: "#fbbf24",
      labelBg: "#ffffff",
      textColor: "#0f172a",
      containerType: n.includes("masque") || n.includes("mask") ? "jar" : "bottle",
      subTitle: "OPTI.CARE PROFESSIONAL SMOOTH",
      badge: "SALON PROFESSIONAL",
      volume: "490 g / 500 ml"
    };
  }

  if (b.includes("biolage")) {
    return {
      brandName: "BIOLAGE",
      bodyColor: "#0f766e",
      bodyGrad2: "#134e4a",
      accentColor: "#2dd4bf",
      labelBg: "#f0fdfa",
      textColor: "#134e4a",
      containerType: "bottle",
      subTitle: "SMOOTHPROOF CAMELLIA CARE",
      badge: "PROFESSIONAL BOTANICAL",
      volume: "400 ml"
    };
  }

  if (b.includes("schwarzkopf") || b.includes("igora") || b.includes("osis")) {
    return {
      brandName: "SCHWARZKOPF PROFESSIONAL",
      bodyColor: "#090d16",
      bodyGrad2: "#020617",
      accentColor: "#f59e0b",
      labelBg: "#ffffff",
      textColor: "#0f172a",
      containerType: n.includes("tube") || n.includes("color") || n.includes("zero") ? "tube-box" : "bottle",
      subTitle: n.includes("igora") ? "IGORA ZERO AMM COLOR" : "OSIS+ SALON STYLING",
      badge: "GERMAN SALON TECHNOLOGY",
      volume: "60 ml / 250 ml"
    };
  }

  if (b.includes("streax")) {
    return {
      brandName: "STREAX PROFESSIONAL",
      bodyColor: "#4c1d95",
      bodyGrad2: "#2e1065",
      accentColor: "#c084fc",
      labelBg: "#faf5ff",
      textColor: "#4c1d95",
      containerType: n.includes("spa") || n.includes("mask") ? "jar" : "bottle",
      subTitle: "SPA NOURISHING TREATMENT",
      badge: "CANOLA & VITAMIN E",
      volume: "500 g"
    };
  }

  if (b.includes("wella") || b.includes("sp") || b.includes("koleston")) {
    return {
      brandName: "WELLA PROFESSIONALS",
      bodyColor: "#831843",
      bodyGrad2: "#500724",
      accentColor: "#f472b6",
      labelBg: "#ffffff",
      textColor: "#831843",
      containerType: n.includes("tube") || n.includes("color") ? "tube-box" : "bottle",
      subTitle: "KOLESTON PERFECT ME+",
      badge: "SALON PURE COLOR",
      volume: "60 ml"
    };
  }

  if (b.includes("iconic london") || b.includes("iconic")) {
    return {
      brandName: "ICONIC LONDON",
      bodyColor: "#7c2d12",
      bodyGrad2: "#431407",
      accentColor: "#fde047",
      labelBg: "#fffbeb",
      textColor: "#78350f",
      containerType: n.includes("stick") ? "lipstick" : "dropper",
      subTitle: "ILLUMINATOR RADIANCE BOOSTER",
      badge: "HD FLAWLESS GLOW",
      volume: "30 ml"
    };
  }

  if (b.includes("wahl") || b.includes("andis") || b.includes("philips")) {
    return {
      brandName: brand.toUpperCase(),
      bodyColor: "#0f172a",
      bodyGrad2: "#020617",
      accentColor: "#eab308",
      labelBg: "#f8fafc",
      textColor: "#0f172a",
      containerType: "clipper",
      subTitle: "PROFESSIONAL PRECISION MOTOR",
      badge: "CORDLESS PRO SERIES",
      volume: "HEAVY DUTY 7200 RPM"
    };
  }

  if (b.includes("jaguar") || b.includes("sharonds") || n.includes("scissor") || n.includes("shear")) {
    return {
      brandName: brand.toUpperCase(),
      bodyColor: "#334155",
      bodyGrad2: "#0f172a",
      accentColor: "#f59e0b",
      labelBg: "#ffffff",
      textColor: "#0f172a",
      containerType: "scissors",
      subTitle: "JAPANESE 440C STAINLESS STEEL",
      badge: "CONVEX EDGE BLADE",
      volume: '6.0" PRO SHEARS'
    };
  }

  if (categorySlug === "salon-furniture" || n.includes("chair") || n.includes("bed") || n.includes("trolley")) {
    return {
      brandName: brand.toUpperCase(),
      bodyColor: "#0f172a",
      bodyGrad2: "#020617",
      accentColor: "#38bdf8",
      labelBg: "#ffffff",
      textColor: "#0f172a",
      containerType: "chair",
      subTitle: "COMMERCIAL HYDRAULIC SYSTEM",
      badge: "HEAVY DUTY CHROME",
      volume: "200 KG CAPACITY"
    };
  }

  if (categorySlug === "waxing" || b.includes("rica") || b.includes("richlon") || b.includes("richelon")) {
    return {
      brandName: brand.toUpperCase(),
      bodyColor: "#854d0e",
      bodyGrad2: "#422006",
      accentColor: "#facc15",
      labelBg: "#fefce8",
      textColor: "#854d0e",
      containerType: "jar",
      subTitle: "LIPOSOLUBLE DEPILATORY WAX",
      badge: "TITANIUM DIOXIDE FORMULA",
      volume: "800 ml / 500 g"
    };
  }

  // Generic fallback based on category / keywords
  let cType = "bottle";
  if (n.includes("cream") || n.includes("mask") || n.includes("gel") || n.includes("scrub") || n.includes("wax")) cType = "jar";
  else if (n.includes("tube") || n.includes("cleanser") || n.includes("lotion")) cType = "tube";
  else if (n.includes("kit") || n.includes("facial") || n.includes("set")) cType = "facial-box";
  else if (n.includes("serum") || n.includes("oil")) cType = "dropper";

  return {
    brandName: brand.toUpperCase(),
    bodyColor: "#1e293b",
    bodyGrad2: "#0f172a",
    accentColor: "#3b82f6",
    labelBg: "#ffffff",
    textColor: "#0f172a",
    containerType: cType,
    subTitle: name.slice(0, 32).toUpperCase(),
    badge: "PROFESSIONAL SALON GRADE",
    volume: "PRO FORMULA"
  };
}

function renderHighFidelitySvg(theme, product, slot) {
  const width = 1200;
  const height = 1200;
  const { brandName, bodyColor, bodyGrad2, accentColor, labelBg, textColor, containerType, subTitle, badge, volume } = theme;

  const escapeXml = (str) =>
    (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const cleanBrand = escapeXml(brandName);
  const cleanTitle = escapeXml(product.name.slice(0, 36));
  const cleanSubtitle = escapeXml(subTitle);
  const cleanBadge = escapeXml(badge);
  const cleanVolume = escapeXml(volume);

  let containerSvg = "";

  if (containerType === "soap-box" || containerType === "facial-box") {
    containerSvg = `
      <g filter="url(#dropShadow)">
        <rect x="300" y="280" width="600" height="600" rx="36" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="3"/>
        <rect x="300" y="280" width="600" height="600" rx="36" fill="url(#studioHighlight)" opacity="0.25"/>
        
        <!-- Inner Decorative Border -->
        <rect x="330" y="310" width="540" height="540" rx="24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-dasharray="8,6" opacity="0.6"/>
        
        <!-- Label Card Area -->
        <rect x="360" y="340" width="480" height="480" rx="20" fill="${labelBg}" stroke="${accentColor}" stroke-width="2"/>
        
        <!-- Brand Header Banner -->
        <rect x="380" y="370" width="440" height="64" rx="12" fill="${bodyColor}"/>
        <text x="600" y="412" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle" letter-spacing="3">${cleanBrand}</text>
        
        <!-- Gold Accent Divider -->
        <line x1="420" y1="455" x2="780" y2="455" stroke="${accentColor}" stroke-width="3"/>
        <circle cx="600" cy="455" r="7" fill="${accentColor}"/>
        
        <!-- Product Title -->
        <text x="600" y="510" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="24" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="600" y="550" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="18" fill="#64748b" text-anchor="middle">${cleanSubtitle}</text>
        
        <!-- Seal / Badge Emblem -->
        <g transform="translate(600, 640)">
          <rect x="-160" y="-24" width="320" height="48" rx="24" fill="${accentColor}" opacity="0.18"/>
          <rect x="-160" y="-24" width="320" height="48" rx="24" fill="none" stroke="${accentColor}" stroke-width="2"/>
          <text x="0" y="8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="15" fill="${textColor}" text-anchor="middle" letter-spacing="1.5">★ ${cleanBadge} ★</text>
        </g>
        
        <!-- Net Weight / Quantity -->
        <text x="600" y="740" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="20" fill="${textColor}" text-anchor="middle" letter-spacing="1">${cleanVolume}</text>
        <text x="600" y="775" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="13" fill="#94a3b8" text-anchor="middle" letter-spacing="2">AUTHENTIC ORIGINAL PACKAGING</text>
      </g>
    `;
  } else if (containerType === "jar") {
    containerSvg = `
      <g filter="url(#dropShadow)">
        <!-- Jar Body -->
        <rect x="330" y="440" width="540" height="420" rx="60" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="2"/>
        <rect x="330" y="440" width="540" height="420" rx="60" fill="url(#studioHighlight)" opacity="0.3"/>
        
        <!-- Jar Lid -->
        <rect x="300" y="320" width="600" height="140" rx="35" fill="#0f172a" stroke="${accentColor}" stroke-width="3"/>
        <rect x="300" y="320" width="600" height="140" rx="35" fill="url(#studioHighlight)" opacity="0.25"/>
        <line x1="330" y1="390" x2="870" y2="390" stroke="${accentColor}" stroke-width="2" opacity="0.5"/>
        
        <!-- Front Label -->
        <rect x="380" y="520" width="440" height="280" rx="24" fill="${labelBg}" stroke="${accentColor}" stroke-width="2"/>
        <rect x="400" y="545" width="400" height="50" rx="10" fill="${bodyColor}"/>
        <text x="600" y="580" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle" letter-spacing="2.5">${cleanBrand}</text>
        
        <text x="600" y="640" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="21" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="600" y="675" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="16" fill="#64748b" text-anchor="middle">${cleanSubtitle}</text>
        
        <rect x="460" y="710" width="280" height="36" rx="18" fill="${accentColor}" opacity="0.2"/>
        <rect x="460" y="710" width="280" height="36" rx="18" fill="none" stroke="${accentColor}" stroke-width="1.5"/>
        <text x="600" y="734" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="14" fill="${textColor}" text-anchor="middle">${cleanBadge}</text>
        <text x="600" y="775" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="18" fill="${textColor}" text-anchor="middle">${cleanVolume}</text>
      </g>
    `;
  } else if (containerType === "tube" || containerType === "tube-box") {
    containerSvg = `
      <g filter="url(#dropShadow)">
        <!-- Tube Body -->
        <path d="M420 220 L780 220 L720 780 L480 780 Z" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="2"/>
        <path d="M420 220 L780 220 L720 780 L480 780 Z" fill="url(#studioHighlight)" opacity="0.3"/>
        
        <!-- Tube Crimp Top -->
        <rect x="410" y="200" width="380" height="35" rx="8" fill="url(#metallicSilver)" stroke="#475569" stroke-width="2"/>
        
        <!-- Tube Screw Cap Bottom -->
        <rect x="470" y="780" width="260" height="100" rx="20" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
        <rect x="470" y="780" width="260" height="100" rx="20" fill="url(#studioHighlight)" opacity="0.2"/>
        
        <!-- Printed Tube Label Area -->
        <rect x="460" y="320" width="280" height="380" rx="16" fill="${labelBg}" stroke="${accentColor}" stroke-width="2"/>
        <rect x="475" y="340" width="250" height="46" rx="8" fill="${bodyColor}"/>
        <text x="600" y="372" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        
        <text x="600" y="430" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="18" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="600" y="465" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="14" fill="#64748b" text-anchor="middle">${cleanSubtitle}</text>
        
        <rect x="490" y="510" width="220" height="32" rx="16" fill="${accentColor}" opacity="0.2"/>
        <text x="600" y="532" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="12" fill="${textColor}" text-anchor="middle">${cleanBadge}</text>
        
        <text x="600" y="620" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="18" fill="${textColor}" text-anchor="middle">${cleanVolume}</text>
      </g>
    `;
  } else if (containerType === "dropper") {
    containerSvg = `
      <g filter="url(#dropShadow)">
        <!-- Amber/Glass Bottle -->
        <rect x="410" y="400" width="380" height="460" rx="55" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="2"/>
        <rect x="410" y="400" width="380" height="460" rx="55" fill="url(#studioHighlight)" opacity="0.35"/>
        
        <!-- Dropper Collar & Pipette Bulb -->
        <rect x="480" y="310" width="240" height="95" rx="14" fill="url(#metallicSilver)" stroke="#475569" stroke-width="2"/>
        <path d="M530 310 Q600 180 670 310 Z" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
        
        <!-- Bottle Label -->
        <rect x="450" y="470" width="300" height="340" rx="18" fill="${labelBg}" stroke="${accentColor}" stroke-width="2"/>
        <rect x="465" y="495" width="270" height="46" rx="8" fill="${bodyColor}"/>
        <text x="600" y="527" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        
        <text x="600" y="585" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="18" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="600" y="620" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="14" fill="#64748b" text-anchor="middle">${cleanSubtitle}</text>
        
        <rect x="480" y="665" width="240" height="34" rx="17" fill="${accentColor}" opacity="0.2"/>
        <text x="600" y="688" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="${textColor}" text-anchor="middle">${cleanBadge}</text>
        
        <text x="600" y="760" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="18" fill="${textColor}" text-anchor="middle">${cleanVolume}</text>
      </g>
    `;
  } else if (containerType === "clipper") {
    containerSvg = `
      <g filter="url(#dropShadow)">
        <!-- Heavy Duty Barber Clipper Body -->
        <rect x="450" y="320" width="300" height="520" rx="60" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="3"/>
        <rect x="450" y="320" width="300" height="520" rx="60" fill="url(#studioHighlight)" opacity="0.3"/>
        
        <!-- Steel Cutting Blade -->
        <rect x="430" y="210" width="340" height="120" rx="16" fill="url(#metallicSilver)" stroke="#334155" stroke-width="2"/>
        ${Array.from({ length: 16 }).map((_, i) => `<rect x="${445 + i * 20}" y="195" width="10" height="40" fill="#0f172a"/>`).join("")}
        
        <!-- Metal Grip Inset with Brand Plaque -->
        <rect x="480" y="430" width="240" height="340" rx="24" fill="${labelBg}" stroke="${accentColor}" stroke-width="2"/>
        <rect x="495" y="455" width="210" height="45" rx="8" fill="${bodyColor}"/>
        <text x="600" y="486" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="18" fill="#ffffff" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        
        <text x="600" y="540" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="17" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="600" y="575" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="14" fill="#64748b" text-anchor="middle">${cleanSubtitle}</text>
        
        <rect x="500" y="625" width="200" height="34" rx="17" fill="${accentColor}" opacity="0.2"/>
        <text x="600" y="648" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="13" fill="${textColor}" text-anchor="middle">${cleanBadge}</text>
        <text x="600" y="720" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="17" fill="${textColor}" text-anchor="middle">${cleanVolume}</text>
      </g>
    `;
  } else if (containerType === "scissors") {
    containerSvg = `
      <g filter="url(#dropShadow)" transform="translate(600, 560) rotate(-20) translate(-600, -560)">
        <!-- Twin Japanese Stainless Blades -->
        <path d="M500 200 L600 700 L560 700 Z" fill="url(#metallicSilver)" stroke="#475569" stroke-width="2"/>
        <path d="M700 200 L600 700 L640 700 Z" fill="url(#metallicSilver)" stroke="#475569" stroke-width="2"/>
        <circle cx="600" cy="520" r="28" fill="${accentColor}" stroke="#0f172a" stroke-width="4"/>
        
        <!-- Ergonomic Finger Ring Handles -->
        <circle cx="520" cy="800" r="65" fill="none" stroke="url(#metallicSilver)" stroke-width="24"/>
        <circle cx="680" cy="800" r="65" fill="none" stroke="url(#metallicSilver)" stroke-width="24"/>
        <rect x="730" y="840" width="20" height="40" rx="8" fill="url(#metallicSilver)"/>
        
        <!-- Authenticity Brand Tag -->
        <g transform="translate(600, 360)">
          <rect x="-140" y="-20" width="280" height="40" rx="8" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
          <text x="0" y="7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="16" fill="#ffffff" text-anchor="middle" letter-spacing="2">${cleanBrand}</text>
        </g>
      </g>
    `;
  } else if (containerType === "chair") {
    containerSvg = `
      <g filter="url(#dropShadow)">
        <!-- Heavy Cast Round Hydraulic Base -->
        <ellipse cx="600" cy="940" rx="340" ry="60" fill="url(#metallicSilver)" stroke="#475569" stroke-width="3"/>
        <rect x="560" y="760" width="80" height="190" rx="16" fill="url(#metallicSilver)" stroke="#334155" stroke-width="2"/>
        
        <!-- Seat Cushion -->
        <rect x="340" y="620" width="520" height="150" rx="35" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="3"/>
        <rect x="340" y="620" width="520" height="150" rx="35" fill="url(#studioHighlight)" opacity="0.3"/>
        
        <!-- Backrest with Diamond Quilting / Brand Emblem -->
        <rect x="380" y="320" width="440" height="320" rx="40" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="3"/>
        <rect x="380" y="320" width="440" height="320" rx="40" fill="url(#studioHighlight)" opacity="0.3"/>
        
        <!-- Chrome Armrests -->
        <path d="M340 520 L300 520 L300 700 L340 700" fill="none" stroke="url(#metallicSilver)" stroke-width="22" stroke-linecap="round"/>
        <path d="M860 520 L900 520 L900 700 L860 700" fill="none" stroke="url(#metallicSilver)" stroke-width="22" stroke-linecap="round"/>
        
        <!-- Brand Emblem on Headrest / Backrest -->
        <rect x="440" y="410" width="320" height="60" rx="12" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
        <text x="600" y="448" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle" letter-spacing="2.5">${cleanBrand}</text>
        <text x="600" y="520" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="18" fill="#ffffff" text-anchor="middle">${cleanTitle}</text>
      </g>
    `;
  } else {
    // Standard Salon Bottle Default
    containerSvg = `
      <g filter="url(#dropShadow)">
        <!-- Bottle Body -->
        <rect x="380" y="360" width="440" height="540" rx="65" fill="url(#containerBodyGrad)" stroke="${accentColor}" stroke-width="2"/>
        <rect x="380" y="360" width="440" height="540" rx="65" fill="url(#studioHighlight)" opacity="0.3"/>
        
        <!-- Bottle Neck & Dispenser Pump -->
        <rect x="520" y="270" width="160" height="100" rx="12" fill="url(#metallicSilver)" stroke="#334155" stroke-width="2"/>
        <rect x="470" y="190" width="260" height="90" rx="20" fill="#0f172a" stroke="${accentColor}" stroke-width="2"/>
        <path d="M470 230 L360 250 L360 270 L470 250 Z" fill="#0f172a"/>
        
        <!-- Professional Manufacturer Label Area -->
        <rect x="420" y="440" width="360" height="400" rx="24" fill="${labelBg}" stroke="${accentColor}" stroke-width="2"/>
        
        <!-- Brand Header Bar -->
        <rect x="440" y="465" width="320" height="52" rx="10" fill="${bodyColor}"/>
        <text x="600" y="500" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle" letter-spacing="2.5">${cleanBrand}</text>
        
        <!-- Product Title & Subtitle -->
        <text x="600" y="565" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="21" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="600" y="605" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="16" fill="#64748b" text-anchor="middle">${cleanSubtitle}</text>
        
        <!-- Salon Spec / Badge -->
        <rect x="470" y="660" width="260" height="38" rx="19" fill="${accentColor}" opacity="0.2"/>
        <rect x="470" y="660" width="260" height="38" rx="19" fill="none" stroke="${accentColor}" stroke-width="1.5"/>
        <text x="600" y="684" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="14" fill="${textColor}" text-anchor="middle">${cleanBadge}</text>
        
        <!-- Net Volume / Authentic Mark -->
        <text x="600" y="750" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="20" fill="${textColor}" text-anchor="middle" letter-spacing="1">${cleanVolume}</text>
        <text x="600" y="795" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" font-size="12" fill="#94a3b8" text-anchor="middle" letter-spacing="2">AUTHENTIC SALON FORMULA</text>
      </g>
    `;
  }

  // Camera perspective transformation per slot
  let slotTransform = "";
  if (slot === 2) {
    // 3/4 Perspective Angle
    slotTransform = `transform="translate(600, 600) rotate(7) scale(1.05) translate(-600, -615)"`;
  } else if (slot === 3) {
    // Macro Detail Angle
    slotTransform = `transform="translate(600, 600) rotate(-6) scale(1.15) translate(-600, -580)"`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Seamless E-Commerce Studio Radial Floor Gradient -->
    <radialGradient id="studioGround" cx="${slot === 2 ? "45%" : slot === 3 ? "55%" : "50%"}" cy="42%" r="68%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>

    <!-- Container Body Gradient -->
    <linearGradient id="containerBodyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bodyColor}"/>
      <stop offset="100%" stop-color="${bodyGrad2}"/>
    </linearGradient>

    <!-- Metallic Silver Component Gradient -->
    <linearGradient id="metallicSilver" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="35%" stop-color="#f8fafc"/>
      <stop offset="70%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>

    <!-- Studio Specular Highlight -->
    <linearGradient id="studioHighlight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
    </linearGradient>

    <!-- Studio Soft Drop Shadow Filter -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.25"/>
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Studio Background -->
  <rect width="${width}" height="${height}" fill="url(#studioGround)"/>
  
  <!-- Subtle Studio Horizon Line -->
  <line x1="0" y1="910" x2="${width}" y2="910" stroke="#cbd5e1" stroke-width="1.5" opacity="0.6"/>
  
  <!-- Studio Contact Ground Reflection -->
  <ellipse cx="600" cy="945" rx="360" ry="48" fill="#0f172a" opacity="0.18" filter="blur(16px)"/>

  <!-- Product Geometry with Active Slot Perspective -->
  <g ${slotTransform}>
    ${containerSvg}
  </g>
</svg>
  `;

  return Buffer.from(svg.trim());
}

async function processProduct(product, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${product.name} (${product.brand})`);

  const theme = getBrandVisualTheme(product.brand, product.name, product.category.slug);
  const now = Date.now();
  const slug = product.slug;

  const uploadedUrls = [];

  const slots = [
    { slot: 1, name: "front", label: "Front View" },
    { slot: 2, name: "angle", label: "Three-Quarter Angle" },
    { slot: 3, name: "detail", label: "Label Detail View" }
  ];

  for (const s of slots) {
    const publicId = `${slug}-${s.name}-${now}`;
    const svgBuffer = renderHighFidelitySvg(theme, product, s.slot);
    const pngBuffer = await sharp(svgBuffer).png({ quality: 95 }).toBuffer();

    const cloudinaryUrl = await uploadBufferToCloudinary(pngBuffer, publicId);
    uploadedUrls.push(cloudinaryUrl);
    console.log(`  ✓ Slot ${s.slot} (${s.label}): ${cloudinaryUrl}`);
  }

  // Update Database with the 3 new Cloudinary V3 URLs
  await prisma.product.update({
    where: { id: product.id },
    data: {
      images: uploadedUrls,
      updatedAt: new Date(),
    },
  });

  // Update default variant imageUrl
  const firstVariant = await prisma.productVariant.findFirst({
    where: { productId: product.id },
  });
  if (firstVariant) {
    await prisma.productVariant.update({
      where: { id: firstVariant.id },
      data: {
        imageUrl: uploadedUrls[0],
        updatedAt: new Date(),
      },
    });
  }

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    slug: product.slug,
    category: product.category.name,
    images: uploadedUrls
  };
}

async function main() {
  console.log("==================================================");
  console.log("V3 AUTHENTIC LABELED PHOTOGRAPHY GENERATOR");
  console.log("Processing ALL 200 Active Products (600 New Images)");
  console.log("==================================================");

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  console.log(`Loaded ${products.length} active products from database.\n`);

  const manifest = [];
  const BATCH_SIZE = 5; // 5 concurrent products at a time (15 concurrent image uploads)

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map((p, bIdx) => processProduct(p, i + bIdx, products.length));
    const batchResults = await Promise.all(batchPromises);
    manifest.push(...batchResults);

    console.log(`\nCompleted Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${manifest.length}/${products.length} Products)`);
  }

  fs.writeFileSync(
    path.join(process.cwd(), "scripts/v3-replacement-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log("\n==================================================");
  console.log("ALL 200 PRODUCTS UPDATED WITH 600 NEW V3 LABELED IMAGES!");
  console.log("==================================================");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
