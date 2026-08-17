import { PrismaClient } from "@prisma/client";
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

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + API_SECRET).digest("hex");
}

async function uploadFileToCloudinary(filePath, publicId) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const folder = "shree-gopi-traders/products/v4";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = {
    folder,
    overwrite: "true",
    public_id: publicId,
    timestamp,
  };
  const signature = sign(paramsToSign);

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";

  const form = new FormData();
  form.append("file", new Blob([fileBuffer], { type: mimeType }), `${publicId}${ext}`);
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

// Find genuine product-specific images across local directories
function findGenuineLocalPhotos(categorySlug, productSlug) {
  const searchDirs = [
    `public/products/${categorySlug}`,
    'public/products',
    'public/images/products'
  ];

  const matched = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith('_') || f.includes('banner') || f.endsWith('.svg')) continue;
      if (!/\.(png|jpg|jpeg|webp)$/i.test(f)) continue;

      const base = f.replace(/\.(png|jpg|jpeg|webp)$/i, '').toLowerCase();
      const slugClean = productSlug.toLowerCase();

      // Exact match or numbered variant of this specific product
      if (base === slugClean || base === `${slugClean}-2` || base === `${slugClean}-3` || base === `${slugClean}-angle` || base === `${slugClean}-detail`) {
        matched.push({ full: path.join(dir, f), name: f });
      }
    }
  }

  if (matched.length === 0) return null;

  const p1 = matched.find(m => !m.name.includes('-2') && !m.name.includes('-3') && !m.name.includes('angle') && !m.name.includes('detail')) || matched[0];
  const p2 = matched.find(m => m.name.includes('-2') || m.name.includes('angle')) || p1;
  const p3 = matched.find(m => m.name.includes('-3') || m.name.includes('detail')) || p2;

  return [p1.full, p2.full, p3.full];
}

async function main() {
  console.log("=== RECONCILING AUTHENTIC PRODUCT IMAGES ONLY ===");
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "asc" }
  });

  let genuineCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    
    // Check if product already has verified V4 generated photos
    const hasV4 = p.images && p.images.some(img => img.includes('/v4/'));
    if (hasV4) {
      console.log(`[${i + 1}/${products.length}] KEEP V4: ${p.name} (${p.slug})`);
      genuineCount++;
      continue;
    }

    // Check for exact matching genuine local assets
    const localPhotos = findGenuineLocalPhotos(p.category.slug, p.slug);
    if (localPhotos) {
      console.log(`[${i + 1}/${products.length}] FOUND GENUINE LOCAL ASSETS for: ${p.name} (${p.slug})`);
      try {
        const u1 = await uploadFileToCloudinary(localPhotos[0], `${p.slug}-front-gen`);
        const u2 = localPhotos[1] !== localPhotos[0] ? await uploadFileToCloudinary(localPhotos[1], `${p.slug}-angle-gen`) : u1;
        const u3 = localPhotos[2] !== localPhotos[1] && localPhotos[2] !== localPhotos[0] ? await uploadFileToCloudinary(localPhotos[2], `${p.slug}-detail-gen`) : u2;

        await prisma.product.update({
          where: { id: p.id },
          data: { images: [u1, u2, u3] }
        });
        updatedCount++;
        genuineCount++;
      } catch (err) {
        console.error(`Upload error for ${p.slug}:`, err.message);
      }
    } else {
      console.log(`[${i + 1}/${products.length}] PENDING AI GENERATION: ${p.name} (${p.slug})`);
    }
  }

  console.log(`\nReconciliation Complete. Total genuine products connected: ${genuineCount} (${updatedCount} newly uploaded from memory/files).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
