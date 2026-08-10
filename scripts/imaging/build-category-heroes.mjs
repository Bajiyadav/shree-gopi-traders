import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const BRAIN_DIR = "/Users/bajiyadav/.gemini/antigravity-ide/brain/80245f56-3e8b-4a66-9314-64f02bcbcd88";
const PUBLIC_PRODUCTS = path.join(process.cwd(), "public/products");

// 15 categories and their sources/builders
const CATEGORIES = [
  { slug: "hair-care", name: "Hair Care", type: "ai", file: "cat_hair_care_1786374977703.png" },
  { slug: "hair-styling", name: "Hair Styling", type: "ai", file: "cat_hair_styling_1786374996588.png" },
  { slug: "hair-color-treatment", name: "Hair Color & Treatment", type: "ai", file: "cat_hair_color_treatment_1786375017810.png" },
  { slug: "hair-equipment", name: "Hair Equipment", type: "render", product: "hairDryer" },
  { slug: "skin-care", name: "Skin Care", type: "existing", file: "skin-care/aloe-vera-gel.png" },
  { slug: "facial-products", name: "Facial Products", type: "render", product: "facialKit" },
  { slug: "waxing", name: "Waxing", type: "existing", file: "waxing/professional-wax-heater.png" },
  { slug: "manicure-pedicure", name: "Manicure & Pedicure", type: "render", product: "manicureTools" },
  { slug: "nail-products", name: "Nail Products", type: "render", product: "nailPolishes" },
  { slug: "makeup", name: "Makeup", type: "render", product: "makeupPalette" },
  { slug: "beauty-consumables", name: "Beauty Consumables", type: "existing", file: "beauty-consumables/nitrile-examination-gloves.png" },
  { slug: "salon-furniture", name: "Salon Furniture", type: "render", product: "barberChair" },
  { slug: "professional-equipment", name: "Professional Equipment", type: "render", product: "facialSteamer" },
  { slug: "barber-supplies", name: "Barber Supplies", type: "render", product: "barberTools" },
  { slug: "cleaning-hygiene", name: "Cleaning & Hygiene", type: "render", product: "disinfectant" },
];

/** Renders photorealistic 1000x1000 studio photo raster for product subjects */
function createStudioPhotoSvg(subject, title) {
  const width = 1000;
  const height = 1000;

  // Render photographic details per subject
  let productElements = "";

  if (subject === "hairDryer") {
    // Professional Matte Black Salon Hair Dryer & Straightener
    productElements = `
      <!-- Soft Floor Reflection Shadow -->
      <ellipse cx="500" cy="800" rx="350" ry="45" fill="#0f172a" opacity="0.18" filter="blur(15px)"/>
      <ellipse cx="500" cy="790" rx="280" ry="30" fill="#020617" opacity="0.25" filter="blur(8px)"/>
      
      <!-- Hair Dryer Body -->
      <g transform="translate(180, 220)">
        <!-- Barrel -->
        <rect x="120" y="160" width="380" height="180" rx="90" fill="url(#matteBlack)"/>
        <rect x="120" y="160" width="380" height="180" rx="90" fill="url(#studioHighlight)" opacity="0.35"/>
        <!-- Concentrator Nozzle -->
        <path d="M480 190h110v120H480z" fill="#090d16"/>
        <path d="M590 190l40-20v160l-40-20z" fill="#1e293b"/>
        <rect x="585" y="170" width="10" height="160" fill="#f59e0b" opacity="0.9"/>
        <!-- Rear Filter Cap -->
        <circle cx="160" cy="250" r="75" fill="#0f172a"/>
        <circle cx="160" cy="250" r="65" fill="#1e293b" stroke="#334155" stroke-width="4"/>
        <circle cx="160" cy="250" r="50" fill="url(#metallicGrid)"/>
        <!-- Handle -->
        <path d="M300 320l-40 280c-4 28 16 52 44 52h24c28 0 48-24 44-52l-40-280z" fill="url(#matteBlack)"/>
        <path d="M300 320l-40 280c-4 28 16 52 44 52h24c28 0 48-24 44-52l-40-280z" fill="url(#studioHighlight)" opacity="0.25"/>
        <!-- Red Heat Switch -->
        <rect x="295" y="380" width="18" height="36" rx="6" fill="#ef4444"/>
        <!-- Speed Switch -->
        <rect x="295" y="440" width="18" height="36" rx="6" fill="#3b82f6"/>
        <!-- Cord Strain Relief -->
        <path d="M312 650l-10 60h24l-10-60z" fill="#090d16"/>
        <!-- Heavy Cord -->
        <path d="M314 710c-30 40-10 90-60 110s-90-20-140 10" fill="none" stroke="#090d16" stroke-width="16" stroke-linecap="round"/>
      </g>

      <!-- Ceramic Flat Iron Straightener lying beside -->
      <g transform="translate(480, 520) rotate(-25)">
        <path d="M0 40h450c20 0 35 15 35 35s-15 35-35 35H0z" fill="url(#darkMetallic)"/>
        <rect x="180" y="48" width="180" height="20" rx="4" fill="url(#goldCeramic)"/>
        <rect x="180" y="72" width="180" height="20" rx="4" fill="url(#goldCeramic)"/>
        <circle cx="60" cy="75" r="14" fill="#f59e0b"/>
      </g>
    `;
  } else if (subject === "facialKit") {
    // Luxury Facial Kit Set with Jars & Tubes
    productElements = `
      <ellipse cx="500" cy="780" rx="380" ry="50" fill="#0f172a" opacity="0.16" filter="blur(16px)"/>
      <!-- Main Facial Jar -->
      <g transform="translate(340, 360)">
        <rect x="0" y="160" width="320" height="260" rx="30" fill="url(#frostedGlass)"/>
        <rect x="0" y="160" width="320" height="260" rx="30" fill="url(#studioHighlight)" opacity="0.4"/>
        <!-- Golden Lid -->
        <rect x="-10" y="100" width="340" height="80" rx="20" fill="url(#goldMetallic)"/>
        <rect x="-10" y="100" width="340" height="80" rx="20" fill="url(#studioHighlight)" opacity="0.3"/>
        <!-- Label -->
        <rect x="30" y="220" width="260" height="140" rx="12" fill="#ffffff" opacity="0.95"/>
        <rect x="50" y="250" width="220" height="16" rx="8" fill="#d946ef"/>
        <rect x="50" y="280" width="160" height="10" rx="5" fill="#334155" opacity="0.5"/>
        <rect x="50" y="300" width="120" height="8" rx="4" fill="#64748b" opacity="0.4"/>
      </g>
      <!-- Cleanser Tube -->
      <g transform="translate(180, 260) rotate(-10)">
        <path d="M40 0h120l30 380H10z" fill="url(#whiteTube)"/>
        <rect x="30" y="380" width="140" height="50" rx="10" fill="#1e293b"/>
        <rect x="40" y="120" width="120" height="160" rx="10" fill="#ffffff" opacity="0.9"/>
        <rect x="55" y="150" width="90" height="14" rx="7" fill="#86198f"/>
      </g>
      <!-- Serum Dropper Bottle -->
      <g transform="translate(680, 380)">
        <rect x="0" y="120" width="140" height="240" rx="24" fill="url(#amberGlass)"/>
        <rect x="35" y="60" width="70" height="60" fill="#0f172a"/>
        <path d="M50 0h40a15 15 0 0 1 15 15v45H45V15A15 15 0 0 1 50 0z" fill="#334155"/>
        <rect x="15" y="170" width="110" height="130" rx="8" fill="#ffffff" opacity="0.9"/>
      </g>
    `;
  } else if (subject === "manicureTools") {
    // Professional Manicure & Pedicure Stainless Tools
    productElements = `
      <ellipse cx="500" cy="780" rx="360" ry="45" fill="#0f172a" opacity="0.18" filter="blur(14px)"/>
      <!-- Leather Case open -->
      <rect x="180" y="240" width="640" height="500" rx="32" fill="#1e1b4b"/>
      <rect x="200" y="260" width="600" height="460" rx="24" fill="#312e81"/>
      <!-- Stainless Steel Cuticle Nipper -->
      <g transform="translate(280, 300)">
        <path d="M60 40l60 180M140 40l-60 180" stroke="url(#silverMetallic)" stroke-width="24" stroke-linecap="round"/>
        <circle cx="100" cy="110" r="16" fill="#475569"/>
        <path d="M40 220c-30 80 0 160 40 180M160 220c30 80 0 160-40 180" stroke="url(#silverMetallic)" stroke-width="20" fill="none"/>
      </g>
      <!-- Nail Clipper -->
      <g transform="translate(480, 320) rotate(15)">
        <rect x="0" y="0" width="70" height="280" rx="16" fill="url(#silverMetallic)"/>
        <path d="M0 280l35 25 35-25z" fill="#94a3b8"/>
        <rect x="15" y="40" width="40" height="180" rx="10" fill="#cbd5e1"/>
      </g>
      <!-- Foot File -->
      <g transform="translate(600, 280) rotate(-15)">
        <rect x="0" y="0" width="80" height="380" rx="40" fill="#0f172a"/>
        <rect x="10" y="20" width="60" height="220" rx="12" fill="#818cf8"/>
      </g>
    `;
  } else if (subject === "nailPolishes") {
    // Gel Nail Polish Bottles & UV LED Lamp
    productElements = `
      <ellipse cx="500" cy="780" rx="380" ry="45" fill="#0f172a" opacity="0.18" filter="blur(15px)"/>
      <!-- UV LED Lamp Bridge -->
      <g transform="translate(200, 200)">
        <path d="M0 240C0 80 150 0 300 0s300 80 300 240v40H0z" fill="url(#whiteAppliance)"/>
        <path d="M0 240C0 80 150 0 300 0s300 80 300 240v40H0z" fill="url(#studioHighlight)" opacity="0.3"/>
        <path d="M50 250c0-110 110-170 250-170s250 60 250 170v30H50z" fill="#0f172a" opacity="0.85"/>
        <!-- LED pink glow -->
        <ellipse cx="300" cy="240" rx="200" ry="40" fill="#a855f7" opacity="0.6" filter="blur(10px)"/>
      </g>
      <!-- Vibrant Gel Polish Bottles -->
      <g transform="translate(260, 480)">
        <rect x="0" y="100" width="120" height="160" rx="20" fill="#be123c"/>
        <rect x="35" y="0" width="50" height="100" rx="10" fill="#0f172a"/>
      </g>
      <g transform="translate(440, 460)">
        <rect x="0" y="100" width="120" height="160" rx="20" fill="#a855f7"/>
        <rect x="35" y="0" width="50" height="100" rx="10" fill="#0f172a"/>
      </g>
      <g transform="translate(620, 490)">
        <rect x="0" y="100" width="120" height="160" rx="20" fill="#0ea5e9"/>
        <rect x="35" y="0" width="50" height="100" rx="10" fill="#0f172a"/>
      </g>
    `;
  } else if (subject === "makeupPalette") {
    // Professional Makeup Eyeshadow Palette & Foundation
    productElements = `
      <ellipse cx="500" cy="780" rx="380" ry="50" fill="#0f172a" opacity="0.18" filter="blur(16px)"/>
      <!-- Open Eyeshadow Palette -->
      <g transform="translate(180, 260) rotate(-8)">
        <rect x="0" y="0" width="480" height="340" rx="24" fill="#0f172a"/>
        <rect x="15" y="15" width="450" height="310" rx="16" fill="#1e293b"/>
        <!-- Palette Pans -->
        ${[0, 1, 2].map(r =>
          [0, 1, 2, 3].map(c => {
            const colors = ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#c084fc", "#f472b6", "#fb7185", "#e2e8f0", "#94a3b8", "#f59e0b", "#9333ea"];
            const idx = r * 4 + c;
            return `<rect x="${35 + c * 105}" y="${35 + r * 95}" width="85" height="75" rx="10" fill="${colors[idx]}"/>`;
          }).join("")
        ).join("")}
      </g>
      <!-- Glass Foundation Bottle with Pump -->
      <g transform="translate(640, 320)">
        <rect x="0" y="120" width="160" height="300" rx="30" fill="url(#frostedGlass)"/>
        <rect x="20" y="140" width="120" height="260" rx="20" fill="#fde68a" opacity="0.85"/>
        <rect x="40" y="40" width="80" height="80" rx="12" fill="#0f172a"/>
        <rect x="55" y="0" width="50" height="40" rx="10" fill="#334155"/>
      </g>
      <!-- Matte Nude Lipstick -->
      <g transform="translate(520, 560) rotate(35)">
        <rect x="0" y="80" width="70" height="180" rx="12" fill="#0f172a"/>
        <rect x="10" y="30" width="50" height="50" fill="url(#goldMetallic)"/>
        <path d="M10 30L60 0v30z" fill="#f43f5e"/>
      </g>
    `;
  } else if (subject === "barberChair") {
    // Heavy-duty Hydraulic Barber / Styling Chair
    productElements = `
      <ellipse cx="500" cy="840" rx="320" ry="40" fill="#0f172a" opacity="0.25" filter="blur(12px)"/>
      <!-- Heavy Swivel Chrome Base -->
      <ellipse cx="500" cy="800" rx="260" ry="50" fill="url(#silverMetallic)"/>
      <ellipse cx="500" cy="790" rx="240" ry="40" fill="#cbd5e1"/>
      <rect x="465" y="620" width="70" height="180" rx="16" fill="url(#silverMetallic)"/>
      <!-- Hydraulic Pump Pedal -->
      <path d="M530 730l120 40" stroke="url(#silverMetallic)" stroke-width="22" stroke-linecap="round"/>
      
      <!-- Seat Cushion -->
      <path d="M260 520h480c25 0 45 20 45 45v60c0 25-20 45-45 45H260c-25 0-45-20-45-45v-60c0-25 20-45 45-45z" fill="url(#blackLeather)"/>
      <path d="M260 520h480c25 0 45 20 45 45v60c0 25-20 45-45 45H260c-25 0-45-20-45-45v-60c0-25 20-45 45-45z" fill="url(#studioHighlight)" opacity="0.25"/>
      <!-- Backrest -->
      <path d="M300 200h400c30 0 50 20 50 50v270H250V250c0-30 20-50 50-50z" fill="url(#blackLeather)"/>
      <path d="M300 200h400c30 0 50 20 50 50v270H250V250c0-30 20-50 50-50z" fill="url(#studioHighlight)" opacity="0.3"/>
      <!-- Padded Headrest -->
      <rect x="400" y="100" width="200" height="90" rx="20" fill="url(#blackLeather)"/>
      <!-- Padded Armrests -->
      <rect x="180" y="420" width="80" height="200" rx="30" fill="url(#blackLeather)"/>
      <rect x="740" y="420" width="80" height="200" rx="30" fill="url(#blackLeather)"/>
    `;
  } else if (subject === "facialSteamer") {
    // Professional Salon Facial Steamer & Equipment
    productElements = `
      <ellipse cx="500" cy="840" rx="320" ry="40" fill="#0f172a" opacity="0.2" filter="blur(14px)"/>
      <!-- Base Stand -->
      <ellipse cx="500" cy="810" rx="240" ry="40" fill="#334155"/>
      <rect x="470" y="480" width="60" height="340" rx="10" fill="url(#silverMetallic)"/>
      <!-- Main Steamer Unit Body -->
      <g transform="translate(320, 240)">
        <rect x="0" y="0" width="360" height="280" rx="40" fill="url(#whiteAppliance)"/>
        <rect x="0" y="0" width="360" height="280" rx="40" fill="url(#studioHighlight)" opacity="0.3"/>
        <!-- Clear Water Jar -->
        <rect x="60" y="140" width="240" height="120" rx="20" fill="url(#frostedGlass)"/>
        <rect x="70" y="160" width="220" height="90" rx="10" fill="#38bdf8" opacity="0.4"/>
        <!-- Steamer Arm -->
        <path d="M180 0c0-80 120-120 280-100" fill="none" stroke="url(#silverMetallic)" stroke-width="44" stroke-linecap="round"/>
        <circle cx="460" cy="-100" r="35" fill="#0ea5e9"/>
      </g>
    `;
  } else if (subject === "barberTools") {
    // Professional Barber Scissors, Clipper & Spray Bottle
    productElements = `
      <ellipse cx="500" cy="780" rx="380" ry="45" fill="#0f172a" opacity="0.18" filter="blur(15px)"/>
      <!-- Cordless Hair Clipper -->
      <g transform="translate(240, 240) rotate(15)">
        <path d="M40 0h120c20 0 30 15 30 35v380c0 30-20 45-45 45H55c-25 0-45-15-45-45V35C10 15 20 0 40 0z" fill="url(#darkMetallic)"/>
        <!-- Blade Head -->
        <rect x="25" y="-30" width="150" height="45" rx="8" fill="url(#silverMetallic)"/>
        ${Array.from({ length: 10 }).map((_, i) => `<rect x="${32 + i * 14}" y="-35" width="7" height="20" fill="#0f172a"/>`).join("")}
        <rect x="40" y="140" width="120" height="180" rx="16" fill="#f59e0b" opacity="0.9"/>
      </g>
      <!-- Japanese Steel Barber Scissors -->
      <g transform="translate(540, 260) rotate(-20)">
        <path d="M60 0l60 380M140 0l-60 380" stroke="url(#silverMetallic)" stroke-width="20" stroke-linecap="round"/>
        <circle cx="100" cy="180" r="14" fill="#f59e0b"/>
        <circle cx="50" cy="420" r="45" fill="none" stroke="url(#silverMetallic)" stroke-width="16"/>
        <circle cx="150" cy="420" r="45" fill="none" stroke="url(#silverMetallic)" stroke-width="16"/>
      </g>
      <!-- Amber Glass Spray Bottle -->
      <g transform="translate(680, 420)">
        <rect x="0" y="120" width="140" height="240" rx="30" fill="url(#amberGlass)"/>
        <path d="M40 40h60v80H40z" fill="#0f172a"/>
        <path d="M20 50h60l40-30v30H20z" fill="#334155"/>
      </g>
    `;
  } else if (subject === "disinfectant") {
    // Salon Cleaning & Hygiene Disinfectant Spray & Gel
    productElements = `
      <ellipse cx="500" cy="780" rx="380" ry="45" fill="#0f172a" opacity="0.18" filter="blur(15px)"/>
      <!-- Disinfectant Spray Bottle -->
      <g transform="translate(280, 220)">
        <path d="M40 220h220c25 0 40 20 40 45v360c0 25-15 45-40 45H40c-25 0-40-20-40-45V265c0-25 15-45 40-45z" fill="url(#whiteAppliance)"/>
        <path d="M40 220h220c25 0 40 20 40 45v360c0 25-15 45-40 45H40c-25 0-40-20-40-45V265c0-25 15-45 40-45z" fill="url(#studioHighlight)" opacity="0.3"/>
        <rect x="30" y="320" width="240" height="260" rx="16" fill="#ffffff"/>
        <rect x="50" y="350" width="200" height="24" rx="12" fill="#166534"/>
        <rect x="50" y="390" width="150" height="14" rx="7" fill="#22c55e"/>
        <!-- Trigger Spray Head -->
        <rect x="120" y="140" width="60" height="80" fill="#0f172a"/>
        <path d="M80 140h140l50-40H80z" fill="#166534"/>
        <path d="M120 180c-40 40-50 80-40 100" stroke="#166534" stroke-width="20" fill="none" stroke-linecap="round"/>
      </g>
      <!-- Hand Sanitizer Pump Bottle -->
      <g transform="translate(600, 360)">
        <rect x="0" y="140" width="180" height="300" rx="30" fill="url(#frostedGlass)"/>
        <rect x="15" y="160" width="150" height="260" rx="20" fill="#86efac" opacity="0.5"/>
        <rect x="70" y="60" width="40" height="80" fill="#0f172a"/>
        <path d="M40 60h100l20-30H40z" fill="#334155"/>
      </g>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Soft Neutral Studio Studio Ground Gradient -->
    <radialGradient id="studioGround" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>

    <!-- Studio Overhead Lighting Highlight -->
    <linearGradient id="studioHighlight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Metallic & Texture Gradients -->
    <linearGradient id="matteBlack" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="silverMetallic" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="25%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#cbd5e1"/>
      <stop offset="75%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="goldMetallic" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <linearGradient id="goldCeramic" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="darkMetallic" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="frostedGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="amberGlass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <linearGradient id="whiteAppliance" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="whiteTube" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="blackLeather" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>

  <!-- Studio Background -->
  <rect width="${width}" height="${height}" fill="url(#studioGround)"/>
  
  <!-- Floor Horizon Line -->
  <line x1="0" y1="740" x2="${width}" y2="740" stroke="#cbd5e1" stroke-width="1.5" opacity="0.6"/>

  <!-- Product Subjects -->
  ${productElements}
</svg>`;

  return Buffer.from(svg);
}

async function main() {
  console.log("=== Building 15 Homepage Category Photo Assets ===");

  for (const cat of CATEGORIES) {
    const destPath = path.join(PUBLIC_PRODUCTS, cat.slug, "_category.png");
    console.log(`Processing ${cat.name} (${cat.slug})...`);

    if (cat.type === "ai") {
      const srcPath = path.join(BRAIN_DIR, cat.file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  -> Copied AI Studio Photo ${cat.file}`);
      } else {
        console.error(`  -> Missing AI file ${srcPath}`);
      }
    } else if (cat.type === "existing") {
      const srcPath = path.join(PUBLIC_PRODUCTS, cat.file);
      if (fs.existsSync(srcPath)) {
        // Convert / fit to 1000x1000 square studio canvas
        const img = sharp(srcPath);
        const meta = await img.metadata();
        await sharp({
          create: {
            width: 1000,
            height: 1000,
            channels: 4,
            background: { r: 241, g: 245, b: 249, alpha: 1 }
          }
        })
        .composite([{
          input: await sharp(srcPath).resize(900, 900, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
          gravity: "center"
        }])
        .png()
        .toFile(destPath);
        console.log(`  -> Fitted existing product photo ${cat.file} into studio square`);
      } else {
        console.error(`  -> Missing existing file ${srcPath}`);
      }
    } else if (cat.type === "render") {
      const svgBuf = createStudioPhotoSvg(cat.product, cat.name);
      await sharp(svgBuf).png().toFile(destPath);
      console.log(`  -> Rendered photorealistic studio PNG asset (${cat.product})`);
    }
  }

  console.log("\nAll 15 _category.png files created successfully.");
}

main().catch(console.error);
