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

  await prisma.product.update({
    where: { id },
    data: { images: [url, url, url] }
  });

  console.log(`Successfully updated ${slug} in database!`);
}

async function main() {
  const items = [
    {
      id: "cmsp425dh0005gr15av5mc265",
      slug: "mdm-herbal-manjistha-soap-100g-x-6",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mdm_manjistha_soap_front_1786937811867.jpg"
    },
    {
      id: "cmsp4i8gb00011cscqgc4esdt",
      slug: "mdm-herbal-neem-with-aloevera-soap-800g",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mdm_neem_aloe_soap_front_1786937983741.jpg"
    },
    {
      id: "cmsp73npk0001heb368q0aitn",
      slug: "mdm-herbal-mulikaa-my-saffron-beauty-soap-150g",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mdm_saffron_soap_front_1786938005120.jpg"
    },
    {
      id: "cmsp7qztv0001yf9nf6ew6kqk",
      slug: "sharonds-6-inch-440c-hair-scissors-set",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/sharonds_scissors_front_1786938135970.jpg"
    },
    {
      id: "cmsp80q100001u6niwxat7wjf",
      slug: "philips-all-in-one-trimmer-3000-series-9-in-1",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/philips_trimmer_front_1786938151314.jpg"
    },
    {
      id: "cmspsb540000mapavbjkerojc",
      slug: "charcoal-leather-shampoo-backwash-unit-tilting-ceramic-basin",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/shampoo_backwash_chair_front_1786938457598.jpg"
    },
    {
      id: "cmspsil2y000to89a9g5pu7ij",
      slug: "deep-exfoliating-facial-scrub-cream-tube-200ml",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/facial_scrub_tube_front_1786938564311.jpg"
    },
    {
      id: "cmspsrko2001i4rq21vk8i475",
      slug: "professional-hair-color-developer-cream-20-vol-1000ml",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/developer_cream_front_1786938689223.jpg"
    },
    {
      id: "cmspss3qo00254rq2pihtmzf7",
      slug: "high-lift-dust-free-bleaching-powder-white-500g",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/bleaching_powder_front_1786938715499.jpg"
    },
    {
      id: "cmspssmm4002s4rq2c1o8wmal",
      slug: "professional-translucent-hd-loose-setting-powder-50g",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/translucent_powder_front_1786938824974.jpg"
    },
    {
      id: "cmspt4jc600018irsp0nhyx9a",
      slug: "professional-titanium-ceramic-hair-straightener-flat-iron-with-digital-lcd",
      path: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/hair_straightener_flat_iron_front_1786939593174.jpg"
    }
  ];

  for (const item of items) {
    await updateProduct(item.id, item.slug, item.path);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
