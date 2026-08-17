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

async function main() {
  const images = {
    front: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mulika_hair_oil_front_1786912027280.jpg",
    angle: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mulika_hair_oil_angle_1786912049118.jpg",
    detail: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mulika_hair_oil_detail_1786912380027.jpg",
  };

  const slug = "mdm-herbal-vana-shampo";
  
  const product = await prisma.product.findUnique({
    where: { slug }
  });

  if (!product) {
    console.error("Product not found");
    return;
  }

  const ts = Date.now();
  console.log("Uploading images...");
  const u1 = await uploadFileToCloudinary(images.front, `${slug}-front-${ts}`);
  const u2 = await uploadFileToCloudinary(images.angle, `${slug}-angle-${ts}`);
  const u3 = await uploadFileToCloudinary(images.detail, `${slug}-detail-${ts}`);

  await prisma.product.update({
    where: { id: product.id },
    data: { images: [u1, u2, u3] }
  });

  console.log("Successfully updated Mulika Hair Oil!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
