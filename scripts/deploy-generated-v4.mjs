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

const mappings = [
  {
    slug: "high-frequency-facial-machine",
    front: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/facial_machine_front_1786887940022.jpg",
    angle: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/facial_machine_detail_1786888573302.jpg",
    detail: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/facial_machine_detail_1786888573302.jpg"
  },
  {
    slug: "jaguar-pre-style-relax-slice-hairdressing-scissors",
    front: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/jaguar_scissors_angle_1786889280308.jpg",
    angle: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/jaguar_scissors_angle_1786889280308.jpg",
    detail: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/jaguar_scissors_detail_1786889320744.jpg"
  },
  {
    slug: "loreal-glycolic-bright-day-cream-spf-17",
    front: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_cream_front_1786889852132.jpg",
    angle: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_cream_angle_1786889879403.jpg",
    detail: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/loreal_cream_detail_1786890204834.jpg"
  },
  {
    slug: "mdm-herbal-vana-shampoo",
    front: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mdm_shampoo_front_1786890251753.jpg",
    angle: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mdm_shampoo_angle_1786890271801.jpg",
    detail: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/mdm_shampoo_front_1786890251753.jpg"
  },
  {
    slug: "barber-spray-bottle",
    front: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/spray_bottle_front_1786890958522.jpg",
    angle: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/spray_bottle_angle_1786891297179.jpg",
    detail: "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/spray_bottle_front_1786890958522.jpg"
  }
];

async function main() {
  console.log("=== DEPLOYING NEW V4 GENERATED IMAGES ===");
  
  for (const m of mappings) {
    console.log(`Processing ${m.slug}...`);
    try {
      const u1 = await uploadFileToCloudinary(m.front, `${m.slug}-front-v4`);
      const u2 = await uploadFileToCloudinary(m.angle, `${m.slug}-angle-v4`);
      const u3 = await uploadFileToCloudinary(m.detail, `${m.slug}-detail-v4`);

      await prisma.product.update({
        where: { slug: m.slug },
        data: { images: [u1, u2, u3] }
      });

      console.log(`PASS: ${m.slug} updated with v4 URLs.`);
    } catch (err) {
      console.error(`Failed ${m.slug}:`, err.message);
    }
  }
  console.log("Deployment Complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
