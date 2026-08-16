import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

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

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("Missing Cloudinary credentials in .env");
  process.exit(1);
}

console.log("Cloudinary Cloud:", CLOUD_NAME);

const VIDEO_DEFS = [
  {
    name: "Video 2 - Salon Wholesale B2B Showcase",
    publicId: "shree-gopi-traders/videos/salon-wholesale-b2b-showcase",
    outputFile: "/tmp/video2_wholesale.mp4",
    images: [
      path.join(process.cwd(), "public/images/banners/b2b-warehouse-banner-premium.png"),
      path.join(process.cwd(), "public/images/banners/spa-equipment-banner-premium.png"),
      path.join(process.cwd(), "public/images/banners/hero-banner-salon-supplies.png"),
      path.join(process.cwd(), "public/images/banners/b2b-warehouse-banner.png")
    ]
  },
  {
    name: "Video 3 - Professional Hair Care Showcase",
    publicId: "shree-gopi-traders/videos/professional-hair-care-showcase",
    outputFile: "/tmp/video3_haircare.mp4",
    images: [
      path.join(process.cwd(), "public/products/hair-care/anti-dandruff-shampoo.png"),
      path.join(process.cwd(), "public/products/hair-care/argan-hair-serum.png"),
      path.join(process.cwd(), "public/products/hair-care/keratin-repair-conditioner.png"),
      path.join(process.cwd(), "public/products/hair-care/keratin-smooth-shampoo.png"),
      path.join(process.cwd(), "public/products/hair-care/hair-fall-control-shampoo.png")
    ]
  },
  {
    name: "Video 4 - Skincare & Facial Showcase",
    publicId: "shree-gopi-traders/videos/skincare-facial-treatment-showcase",
    outputFile: "/tmp/video4_skincare.mp4",
    images: [
      path.join(process.cwd(), "public/products/facial-products/diamond-facial-kit.png"),
      path.join(process.cwd(), "public/products/facial-products/bridal-facial-kit.png"),
      path.join(process.cwd(), "public/products/skin-care/cetaphil-gentle-skin-cleanser.png"),
      path.join(process.cwd(), "public/products/skin-care/face-scrub.png"),
      path.join(process.cwd(), "public/products/professional-equipment/high-frequency-facial-machine.png")
    ]
  },
  {
    name: "Video 5 - Complete Salon Supply Turnkey",
    publicId: "shree-gopi-traders/videos/complete-salon-supply-turnkey",
    outputFile: "/tmp/video5_salonsupply.mp4",
    images: [
      path.join(process.cwd(), "public/products/barber-supplies/barber-spray-bottle.png"),
      path.join(process.cwd(), "public/products/waxing/aloe-vera-soft-wax.png"),
      path.join(process.cwd(), "public/products/waxing/hard-wax-beans.png"),
      path.join(process.cwd(), "public/products/salon-furniture/charcoal-grey-reclining-hydraulic-facial-barber-chair.png"),
      path.join(process.cwd(), "public/products/salon-furniture/cream-gold-hydraulic-salon-styling-chair.png")
    ]
  }
];

function generateVideo(def) {
  console.log(`\nGenerating MP4 for: ${def.name}...`);
  const inputs = [];
  const filterParts = [];

  def.images.forEach((img, i) => {
    if (!fs.existsSync(img)) {
      throw new Error(`Image not found: ${img}`);
    }
    inputs.push(`-loop 1 -t 2.0 -i "${img}"`);
    filterParts.push(
      `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0b0f19,format=yuv420p,setsar=1[v${i}]`
    );
  });

  const concatInputs = def.images.map((_, i) => `[v${i}]`).join("");
  const filterComplex = `${filterParts.join(";")};${concatInputs}concat=n=${def.images.length}:v=1:a=0[outv]`;

  const cmd = `ffmpeg -y ${inputs.join(" ")} -filter_complex "${filterComplex}" -map "[outv]" -c:v libx264 -preset fast -b:v 1500k -maxrate 2000k -bufsize 3000k -movflags +faststart -r 30 "${def.outputFile}"`;

  execSync(cmd, { stdio: "inherit" });

  const stats = fs.statSync(def.outputFile);
  console.log(`✓ Created ${def.outputFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function uploadToCloudinary(def) {
  console.log(`Uploading to Cloudinary: ${def.publicId}...`);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "shree-gopi-traders/videos";
  const public_id = def.publicId.replace("shree-gopi-traders/videos/", "");

  const paramsToSign = {
    folder: folder,
    public_id: public_id,
    timestamp: timestamp,
  };

  const sortedKeys = Object.keys(paramsToSign).sort();
  const stringToSign = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join("&") + API_SECRET;
  const signature = createHash("sha1").update(stringToSign).digest("hex");

  const fileBuffer = fs.readFileSync(def.outputFile);
  const blob = new Blob([fileBuffer], { type: "video/mp4" });

  const formData = new FormData();
  formData.append("file", blob, path.basename(def.outputFile));
  formData.append("api_key", API_KEY);
  formData.append("timestamp", timestamp.toString());
  formData.append("folder", folder);
  formData.append("public_id", public_id);
  formData.append("signature", signature);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed for ${def.publicId}: ${res.status} ${errorText}`);
  }

  const json = await res.json();
  console.log(`✓ Cloudinary Upload SUCCESS: ${json.secure_url}`);
  return json.secure_url;
}

async function main() {
  const uploadedUrls = {};

  for (const def of VIDEO_DEFS) {
    generateVideo(def);
    const url = await uploadToCloudinary(def);
    uploadedUrls[def.name] = url;
  }

  console.log("\n==================================================");
  console.log("ALL 4 UNIQUE CLOUDINARY VIDEOS UPLOADED SUCCESSFULLY");
  console.log("==================================================");
  console.log(JSON.stringify(uploadedUrls, null, 2));

  fs.writeFileSync(
    path.join(process.cwd(), "scripts/cloudinary-video-urls.json"),
    JSON.stringify(uploadedUrls, null, 2)
  );
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
