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

async function updateProduct(id, slug, imagePath) {
  const ts = Date.now();
  console.log(`Uploading image for ${slug}...`);
  const url = await uploadFileToCloudinary(imagePath, `${slug}-front-${ts}`);

  // Set exactly 2 identical images as requested by the user
  await prisma.product.update({
    where: { id },
    data: { images: [url, url] }
  });

  console.log(`Successfully updated ${slug} in database with 2 image URLs!`);
}

async function main() {
  const items = [
    {
      id: "cmspubtaz001twvephkvrpahi",
      slug: "professional-ultrasonic-facial-skin-scrubber-spatula",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/scrubber_spatula_front_1786976429193.jpg"
    },
    {
      id: "cmspuvvhh0001upiehik5vkfr",
      slug: "jaguar-pre-style-relax-slice-hairdressing-scissors-set",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/jaguar_scissors_55_front_1786976443519.jpg"
    },
    {
      id: "cmsuf4cu00001j4kzja9phb4w",
      slug: "l-oreal-professionnel-serie-expert-absolut-repair-shampoo",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_absolut_repair_shampoo_front_1786976689147.jpg"
    }
  ];

  for (const item of items) {
    await updateProduct(item.id, item.slug, item.path);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
