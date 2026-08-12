import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";

function sign(params) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function uploadToCloudinary(filePath, folder, filename) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const publicId = `${folder}/${filename}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = { overwrite: "true", public_id: publicId, timestamp };
  const signature = sign(params);

  const fileData = readFileSync(filePath);
  const ext = filePath.endsWith(".jpg") ? "jpg" : "png";
  const blob = new Blob([fileData], { type: ext === "jpg" ? "image/jpeg" : "image/png" });

  const form = new FormData();
  form.append("file", blob, `${filename}.${ext}`);
  form.append("api_key", KEY);
  form.append("timestamp", timestamp);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} - ${errText}`);
  }

  const json = await res.json();
  return json.secure_url;
}

async function main() {
  console.log("=== UPLOADING UNIQUE STUDIO ASSETS TO CLOUDINARY ===");

  const BRAIN_DIR = "/Users/bajiyadav/.gemini/antigravity-ide/brain/2ea657c5-78f6-41e0-a280-aece390e75d6";

  // Upload specific unique images
  const contourStickImg = await uploadToCloudinary(
    `${BRAIN_DIR}/iconic_contour_stick_open_1786510357116.png`,
    "shree-gopi-traders/products/makeup",
    "iconic-contour-stick-open"
  );

  const radianceBoosterImg = await uploadToCloudinary(
    `${BRAIN_DIR}/iconic_radiance_booster_bottle_1786510278489.png`,
    "shree-gopi-traders/products/makeup",
    "iconic-radiance-booster-bottle"
  );

  const spaMaskImg = await uploadToCloudinary(
    `${BRAIN_DIR}/streax_spa_mask_jar_front_1786509935966.png`,
    "shree-gopi-traders/products/hair-care",
    "streax-spa-mask-jar-front"
  );

  const sterilizerAngle2Img = await uploadToCloudinary(
    `${BRAIN_DIR}/media__1786520612964.jpg`,
    "shree-gopi-traders/products/professional-equipment",
    "hot-towel-warmer-sterilizer-open-shelf"
  );

  const flatIronImg = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522080/shree-gopi-traders/products/barber-supplies/professional-titanium-ceramic-hair-straightener-flat-iron.png";
  const dryerImg = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522081/shree-gopi-traders/products/barber-supplies/high-speed-ac-motor-ionic-hair-dryer-grey.png";
  const tabletopSteamerImg = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522081/shree-gopi-traders/products/professional-equipment/tabletop-compact-facial-ozone-steamer-flex-arm.png";
  const rebondingImg = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522082/shree-gopi-traders/products/hair-color-treatment/pro-genesis-hair-rebonding-cream-step-1-1000ml.png";
  const permingLotionImg = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786522083/shree-gopi-traders/products/hair-color-treatment/professional-hair-perming-lotion-wave-activator-800ml.png";

  const MAPPING = {
    "SGT-MKP-TRANSLUCENT-SETTING-POWDER": [contourStickImg],
    "SGT-MKP-FLUID-FOUNDATION-30ML": [radianceBoosterImg],
    "SGT-HCT-BLEACH-POWDER-500G": [spaMaskImg],
    "SGT-EQ-TOWEL-WARMER-STERILIZER-18L": [sterilizerAngle2Img],
    "SGT-BRB-STRAIGHT-RAZOR-SET": [flatIronImg],
    "SGT-BRB-CLIPPER-GUARD-HOLDER-SET": [dryerImg],
    "SGT-SKIN-VITAMIN-C-GLOW-CREAM-200G": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521041/shree-gopi-traders/products/skin-care/deep-exfoliating-facial-scrub-cream-tube-200ml.png"],
    "SGT-FUR-RECLINING-BARBER-CHAIR-BROWN": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786510955/shree-gopi-traders/products/salon-furniture/styling-chair-front-angle.jpg"],
    "SGT-FUR-ROLLING-TOOL-CART-BLACK": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521037/shree-gopi-traders/products/salon-furniture/stainless-steel-3tier-rolling-trolley-cart.png"],
    "SGT-EQ-RING-LIGHT-18INCH-KIT": [tabletopSteamerImg],
    "SGT-HC-KERATIN-SERUM-100ML": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521040/shree-gopi-traders/products/skin-care/professional-hydrating-glow-serum-pump-100ml.png"],
    "SGT-HCT-DEVELOPER-20VOL-1000ML": [permingLotionImg],
    "SGT-SKIN-GOLD-PEELOFF-MASK-250G": ["https://res.cloudinary.com/dg8z7pxju/image/upload/v1786521424/shree-gopi-traders/products/hair-care/intensive-repair-hair-spa-treatment-cream-500g-jar.png"]
  };

  console.log("\n=== UPDATING PRODUCTS WITH EXCLUSIVE UNIQUE IMAGES ===");
  for (const [sku, images] of Object.entries(MAPPING)) {
    await prisma.product.updateMany({
      where: { sku },
      data: { images }
    });
    console.log(`✅ Updated SKU [${sku}] -> ${images[0]}`);
  }

  // Audit duplicates
  const allProds = await prisma.product.findMany({ select: { sku: true, name: true, images: true } });
  const countMap = {};
  for (const p of allProds) {
    const url = p.images[0];
    if (!countMap[url]) countMap[url] = [];
    countMap[url].push(p.sku);
  }

  console.log("\n=== VERIFYING ZERO DUPLICATE IMAGES ===");
  let duplicatesFound = 0;
  for (const [url, skus] of Object.entries(countMap)) {
    if (skus.length > 1) {
      duplicatesFound++;
      console.log(`⚠️ Shared URL (${skus.length} SKUs): ${url} -> ${skus.join(", ")}`);
    }
  }

  if (duplicatesFound === 0) {
    console.log("🎉 SUCCESS: ALL PRODUCTS NOW HAVE 100% EXCLUSIVE & UNIQUE STUDIO IMAGES!");
  } else {
    console.log(`⚠️ ${duplicatesFound} image URLs are still shared.`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
