import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const dotenv = fs.readFileSync(".env", "utf-8");
const env = {};
for (const l of dotenv.split("\n")) {
  const idx = l.indexOf("=");
  if (idx>0) { const k=l.slice(0,idx).trim(); const v=l.slice(idx+1).trim().replace(/^["'"'"']|["'"'"']$/g,""); env[k]=v; }
}
const CLOUD=env.CLOUDINARY_CLOUD_NAME;
const KEY=env.CLOUDINARY_API_KEY;
const SECRET=env.CLOUDINARY_API_SECRET;

async function uploadFile(filePath, publicId) {
  const folder = "shree-gopi-traders/products/v4";
  const ts = Math.floor(Date.now()/1000).toString();
  const params = { folder, overwrite:"true", public_id: publicId, timestamp: ts };
  const canonical = Object.keys(params).sort().map(k=>k+"="+params[k]).join("&");
  const sig = createHash("sha1").update(canonical+SECRET).digest("hex");
  const buf = fs.readFileSync(filePath);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "image/jpeg" }), publicId+".jpg");
  form.append("api_key", KEY);
  form.append("timestamp", ts);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", sig);
  const res = await fetch("https://api.cloudinary.com/v1_1/"+CLOUD+"/image/upload", { method:"POST", body:form });
  const j = await res.json();
  if (!j.secure_url) { console.error("FAIL", publicId, JSON.stringify(j)); return null; }
  return j.secure_url;
}

const artifactsDir = "/Users/bajiyadav/.gemini/antigravity-ide/brain/97ac593c-9674-4caa-b493-2404188b5fc6/";

const mapping = [
  { id: "cmsuf6b55003hj4kzyenqc8p9", file: "streax_shampoo_front_1786906074942.jpg", slug: "streax-professional-vitariche-care-repair-max-shampoo" },
  { id: "cmsuf6c6p003jj4kz9eet2m06", file: "streax_masque_front_1786906511285.jpg", slug: "streax-professional-vitariche-care-repair-max-masque" },
  { id: "cmsuf6eib003nj4kzct3q1g81", file: "streax_canvoline_front_1786906525933.jpg", slug: "streax-professional-canvoline-straightening-cream" },
  { id: "cmsuf6ppw0047j4kz254u98uf", file: "wella_eimi_front_1786906633649.jpg", slug: "wella-professionals-eimi-thermal-image-heat-protection-spray" },
  { id: "cmsuf6omm0045j4kzi3ck92bw", file: "wella_elements_front_1786907041362.jpg", slug: "wella-professionals-elements-renewing-shampoo" },
  { id: "cmsuf6qyv0049j4kz61cy5pb7", file: "wella_koleston_front_1786907055256.jpg", slug: "wella-professionals-koleston-perfect-me-hair-color" },
  { id: "cmsuf6nh30043j4kz2nby0mkq", file: "wella_invigo_mask_front_1786907428034.jpg", slug: "wella-professionals-invigo-nutri-enrich-deep-nourishing-mask" },
  { id: "cmsuf6mf10041j4kz74mrf77r", file: "wella_invigo_shampoo_front_1786907708863.jpg", slug: "wella-professionals-invigo-nutri-enrich-deep-nourishing-shampoo" }
];

async function run() {
  for (const item of mapping) {
    console.log("Processing", item.slug);
    const filePath = path.join(artifactsDir, item.file);
    if (!fs.existsSync(filePath)) {
      console.error("Missing file:", filePath);
      continue;
    }
    const publicId = item.slug + "-v4";
    console.log("Uploading to Cloudinary...");
    const url = await uploadFile(filePath, publicId);
    if (url) {
      console.log("Uploaded:", url);
      await prisma.product.update({
        where: { id: item.id },
        data: { images: [url, url, url] } // duplicate for 3 views to be safe
      });
      console.log("Updated DB for", item.slug);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
