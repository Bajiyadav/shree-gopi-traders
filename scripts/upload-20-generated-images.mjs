import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function uploadToCloudinary(filePath, folder, filename) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const publicId = `${folder}/${filename}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { overwrite: "true", public_id: publicId, timestamp };
  const signature = sign(params);

  const fileData = readFileSync(filePath);
  const blob = new Blob([fileData], { type: "image/png" });

  const form = new FormData();
  form.append("file", blob, `${filename}.png`);
  form.append("api_key", KEY);
  form.append("timestamp", timestamp);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} - ${errText}`);
  }

  const json = await res.json();
  return json.secure_url;
}

const PRODUCTS_TO_UPDATE = [
  {
    sku: "SGT-HC-IGORA-ZERO-AMM",
    folder: "shree-gopi-traders/products/hair-color-treatment",
    images: [
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/igora_zero_amm_tube_box_1786509900262.png", name: "igora-zero-amm-tube-box" },
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/igora_zero_amm_cream_swatch_1786509918690.png", name: "igora-zero-amm-cream-swatch" },
    ]
  },
  {
    sku: "SGT-HC-STREAX-SPA-CARE-MASK",
    folder: "shree-gopi-traders/products/hair-care",
    images: [
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/streax_spa_mask_jar_front_1786509935966.png", name: "streax-spa-mask-jar-front" },
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/streax_spa_mask_creamy_texture_1786510258732.png", name: "streax-spa-mask-creamy-texture" },
    ]
  },
  {
    sku: "SGT-MK-ICONIC-RADIANCE-BOOSTER",
    folder: "shree-gopi-traders/products/makeup",
    images: [
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/iconic_radiance_booster_bottle_1786510278489.png", name: "iconic-radiance-booster-bottle" },
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/iconic_radiance_booster_swatch_1786510336431.png", name: "iconic-radiance-booster-swatch" },
    ]
  },
  {
    sku: "SGT-MK-ICONIC-FOUNDATION-CONTOUR-STICK",
    folder: "shree-gopi-traders/products/makeup",
    images: [
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/iconic_contour_stick_open_1786510357116.png", name: "iconic-contour-stick-open" },
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/iconic_contour_stick_swatches_1786510586896.png", name: "iconic-contour-stick-swatches" },
    ]
  },
  {
    sku: "SGT-FUR-CREAM-GOLD-CHAIR",
    folder: "shree-gopi-traders/products/salon-furniture",
    images: [
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/styling_chair_front_angle_1786510830722.png", name: "styling-chair-front-angle" },
      { local: "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6/styling_chair_side_hydraulic_1786510845815.png", name: "styling-chair-side-hydraulic" },
    ]
  }
];

async function main() {
  console.log("=== UPLOADING AI-GENERATED STUDIO IMAGES TO CLOUDINARY ===");
  for (const item of PRODUCTS_TO_UPDATE) {
    const cUrls = [];
    for (const img of item.images) {
      console.log(`Uploading [${img.name}] for SKU: ${item.sku}...`);
      const url = await uploadToCloudinary(img.local, item.folder, img.name);
      console.log(`  ✅ Cloudinary URL: ${url}`);
      cUrls.push(url);
    }
    const p = await prisma.product.findUnique({ where: { sku: item.sku } });
    if (p) {
      await prisma.product.update({
        where: { id: p.id },
        data: { images: cUrls }
      });
      console.log(`✅ Product [${item.sku}] ${p.name} updated with ${cUrls.length} Cloudinary images!\n`);
    } else {
      console.error(`❌ Product not found by SKU: ${item.sku}\n`);
    }
  }
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
