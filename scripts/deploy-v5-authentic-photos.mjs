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
const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + API_SECRET).digest("hex");
}

async function uploadFileToCloudinary(filePath, publicId) {
  const folder = "shree-gopi-traders/products/v5";
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

function getAllMedia() {
  const media = [];
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) scan(full);
      else if (/\.(png|jpg|jpeg|webp)$/i.test(f) && !f.endsWith('.svg')) {
        media.push({ file: f, path: full, size: fs.statSync(full).size });
      }
    }
  }
  scan('public/images');
  scan('public/products');
  return media;
}

async function main() {
  console.log("Starting Genuine Photo Deployment (v5)...");
  
  const allMedia = getAllMedia();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" }
  });

  let updated = 0;
  const noMatchProducts = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const slug = p.slug.toLowerCase();

    // Strict fuzzy matching
    const words = slug.split('-').filter(w => w.length > 2 && !["and", "with", "for", "the", "pack", "set", "hair", "oil", "care", "beauty", "professional", "cream", "shampoo", "conditioner", "serum"].includes(w));
    
    const scored = allMedia.map(m => {
      let score = 0;
      const fn = m.file.toLowerCase();
      if (fn.includes(slug)) score += 100;
      for (const w of words) {
        if (fn.includes(w)) score += 20;
      }
      return { ...m, score };
    }).filter(m => m.score >= 40).sort((a,b) => b.score - a.score);

    if (scored.length > 0) {
      const best = scored[0];
      const second = scored[1] && scored[1].score >= 40 ? scored[1] : best;
      const third = scored[2] && scored[2].score >= 40 ? scored[2] : second;

      try {
        const ts = Date.now();
        const u1 = await uploadFileToCloudinary(best.path, `${slug}-front-${ts}`);
        const u2 = second !== best ? await uploadFileToCloudinary(second.path, `${slug}-angle-${ts}`) : u1;
        const u3 = third !== second && third !== best ? await uploadFileToCloudinary(third.path, `${slug}-detail-${ts}`) : (second !== best ? u2 : u1);

        await prisma.product.update({
          where: { id: p.id },
          data: { images: [u1, u2, u3] }
        });

        updated++;
        console.log(`[${i + 1}/${products.length}] UPDATED: ${p.name} -> ${path.basename(best.path)}`);
      } catch (err) {
        console.error(`Failed updating ${p.name}:`, err.message);
      }
    } else {
        noMatchProducts.push(p);
    }
  }

  console.log(`\nSuccessfully upgraded ${updated} products with local genuine photos.`);
  
  fs.writeFileSync("scripts/pending_ai_generation.json", JSON.stringify(noMatchProducts, null, 2));
  console.log(`Wrote ${noMatchProducts.length} pending products to pending_ai_generation.json`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
