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
      id: "cmsuf4dvy0003j4kzn27o7vzm",
      slug: "l-oreal-professionnel-serie-expert-absolut-repair-mask",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_absolut_mask_front_1786992633922.jpg"
    },
    {
      id: "cmsuf4exr0005j4kzmw1p7xy9",
      slug: "l-oreal-professionnel-x-tenso-care-pro-keratin-shampoo",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_xtenso_shampoo_front_1786992774773.jpg"
    },
    {
      id: "cmsuf4g1j0007j4kzt48tqa74",
      slug: "l-oreal-professionnel-x-tenso-care-masque",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_xtenso_mask_front_1786992803896.jpg"
    },
    {
      id: "cmsuf4h7s0009j4kz8h4amfgx",
      slug: "l-oreal-professionnel-tecni-art-web-design-sculpting-paste",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_tecni_art_front_1786992813578.jpg"
    },
    {
      id: "cmsuf4idv000bj4kzd1n3gh6i",
      slug: "matrix-opti-care-professional-smooth-straight-shampoo",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/matrix_opti_shampoo_front_1786992975083.jpg"
    },
    {
      id: "cmsuf4jfd000dj4kz30b0kf3p",
      slug: "matrix-opti-care-professional-smooth-straight-conditioner",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/matrix_opti_conditioner_front_1786993003662.jpg"
    },
    {
      id: "cmsuf4kgp000fj4kz5sc732gk",
      slug: "matrix-opti-care-professional-smooth-straight-masque",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/matrix_opti_mask_front_1786993020431.jpg"
    },
    {
      id: "cmsuf4lkm000hj4kzao3s8huq",
      slug: "matrix-biolage-smoothproof-smoothing-serum",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/biolage_smoothproof_serum_front_1786993035313.jpg"
    },
    {
      id: "cmsuf4o1u000lj4kzpkqinhpe",
      slug: "biolage-advanced-fiberstrong-shampoo",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/biolage_fiberstrong_shampoo_front_1786993046465.jpg"
    },
    {
      id: "cmsuf4p5e000nj4kz84cpjff4",
      slug: "biolage-advanced-fiberstrong-conditioner",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/biolage_fiberstrong_conditioner_front_1786993060013.jpg"
    }
  ];

  for (const item of items) {
    await updateProduct(item.id, item.slug, item.path);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
