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
      id: "cmsuf4zbn0015j4kz77eo2ixe",
      slug: "krone-professional-keratin-infused-shampoo",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/krone_keratin_shampoo_front_1787010627279.jpg"
    },
    {
      id: "cmsuf51u80019j4kzpial0qff",
      slug: "krone-professional-hair-styling-gel",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/krone_styling_gel_front_1787010646832.jpg"
    },
    {
      id: "cmsuf52vo001bj4kzrr8g7ue7",
      slug: "krone-professional-volume-hair-spray",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/krone_hair_spray_front_1787010695716.jpg"
    },
    {
      id: "cmsuf53ym001dj4kzj1h983qn",
      slug: "krone-professional-hair-clipper",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/krone_clipper_front_1787010828978.jpg"
    },
    {
      id: "cmsuf5504001fj4kz672gosa3",
      slug: "dreamron-professional-hair-color-cream",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/dreamron_color_cream_front_1787011189761.jpg"
    },
    {
      id: "cmsuf5650001hj4kz38gy6bfz",
      slug: "dreamron-developer-cream-20-vol",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/dreamron_developer_front_1787012123881.jpg"
    },
    {
      id: "cmsuf589i001lj4kz7208pecy",
      slug: "dreamron-spa-nourishing-conditioner",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/dreamron_conditioner_front_1787011813587.jpg"
    },
    {
      id: "cmsuf5agr001pj4kzowi46yju",
      slug: "bio-keratin-luxury-shampoo",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/biokeratin_shampoo_front_1787011826333.jpg"
    },
    {
      id: "cmsuf5bkg001rj4kzdsdf8qx0",
      slug: "bio-keratin-luxury-masque",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/biokeratin_mask_front_1787012088831.jpg"
    },
    {
      id: "cmsuf5cwy001tj4kz81hdwxej",
      slug: "bio-keratin-hair-serum",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/biokeratin_serum_front_1787012101929.jpg"
    }
  ];

  for (const item of items) {
    await updateProduct(item.id, item.slug, item.path);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
