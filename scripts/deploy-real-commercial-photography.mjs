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
  const folder = "shree-gopi-traders/products/v3";
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

async function uploadUrlToCloudinary(sourceUrl, publicId) {
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
  form.append("file", sourceUrl);
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

async function main() {
  console.log("Starting Real Commercial Product Photography Deployment...");
  
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: "asc" }
  });

  console.log(`Auditing and upgrading ${products.length} active catalogue products...`);

  // Build a map of all local photographic files
  const localPhotos = new Map();
  function indexDir(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        indexDir(full);
      } else if (/\.(png|jpg|jpeg|webp)$/i.test(f) && !f.endsWith('.svg')) {
        const base = f.replace(/\.[a-z]+$/i, '').toLowerCase();
        localPhotos.set(base, full);
      }
    }
  }
  indexDir('public/images');
  indexDir('public/products');

  console.log(`Found ${localPhotos.size} local photographic image assets.`);

  let updatedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const baseSlug = p.slug.toLowerCase();

    // Check if we have specific local photographic files for this product
    const photo1 = localPhotos.get(baseSlug) || localPhotos.get(`${baseSlug}-front`) || localPhotos.get(`${baseSlug}-hero`) || localPhotos.get(`${baseSlug}-primary-hero`);
    const photo2 = localPhotos.get(`${baseSlug}-2`) || localPhotos.get(`${baseSlug}-angle`) || localPhotos.get(`${baseSlug}-desk-hero`);
    const photo3 = localPhotos.get(`${baseSlug}-3`) || localPhotos.get(`${baseSlug}-detail`) || localPhotos.get(`${baseSlug}-angles-sheet`);

    if (photo1) {
      try {
        const ts = Date.now();
        const u1 = await uploadFileToCloudinary(photo1, `${baseSlug}-front-${ts}`);
        const u2 = photo2 ? await uploadFileToCloudinary(photo2, `${baseSlug}-angle-${ts}`) : u1;
        const u3 = photo3 ? await uploadFileToCloudinary(photo3, `${baseSlug}-detail-${ts}`) : (photo2 ? u2 : u1);

        await prisma.product.update({
          where: { id: p.id },
          data: { images: [u1, u2, u3] }
        });

        console.log(`[${i + 1}/${products.length}] UPGRADED with Real Photo: ${p.name}`);
        updatedCount++;
      } catch (err) {
        console.error(`Error uploading photo for ${p.name}:`, err.message);
      }
    }
  }

  console.log(`\nDeployment Complete. Updated ${updatedCount} products with genuine commercial photography.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
