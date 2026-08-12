import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "dg8z7pxju";
const KEY = process.env.CLOUDINARY_API_KEY || "295259549445344";
const SECRET = process.env.CLOUDINARY_API_SECRET || "tj9fn-VBngZAjrwFxRvLvsWWI64";
const FOLDER = "shree-gopi-traders/products";

function sign(params: Record<string, string | number>) {
  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(canonical + SECRET).digest("hex");
}

async function uploadToCloudinary(buf: Buffer, filename: string, publicId: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder: FOLDER, public_id: publicId, overwrite: "true", timestamp: String(timestamp) };

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)]), filename);
  form.append("api_key", KEY);
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
  form.append("signature", sign(signed));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return body.secure_url!;
}

async function main() {
  console.log("=== CLOUDINARY UPLOAD ALL IMAGES TO PRODUCT CATALOGUE ===");
  console.log(`Cloud Name: ${CLOUD}`);
  console.log(`API Key: ${KEY}`);

  const publicProductsDir = join(process.cwd(), "public", "products");
  if (!existsSync(publicProductsDir)) {
    console.error("public/products directory not found");
    return;
  }

  const activeProducts = await prisma.product.findMany({
    where: { isActive: true },
    include: { variants: true, category: true },
  });
  console.log(`Active Products in Database: ${activeProducts.length}`);

  const activeCategories = await prisma.category.findMany({
    where: { isActive: true },
  });
  console.log(`Active Categories in Database: ${activeCategories.length}`);

  // 1. Upload Category images (_category.png)
  console.log("\n--- Processing Category Images ---");
  for (const cat of activeCategories) {
    const catImgPath = join(publicProductsDir, cat.slug, "_category.png");
    if (existsSync(catImgPath)) {
      const buf = readFileSync(catImgPath);
      const publicId = `${cat.slug}/_category`;
      try {
        const url = await uploadToCloudinary(buf, "_category.png", publicId);
        console.log(`✓ Category '${cat.name}' image uploaded: ${url}`);
        await prisma.category.update({
          where: { id: cat.id },
          data: { imageUrl: url },
        });
      } catch (err: any) {
        console.error(`✗ Failed category '${cat.name}':`, err.message);
      }
    }
  }

  // 2. Upload Product Images
  console.log("\n--- Processing Product Images ---");
  let updatedProductsCount = 0;

  for (const prod of activeProducts) {
    const catSlug = prod.category.slug;
    const prodSlug = prod.slug;
    const catDir = join(publicProductsDir, catSlug);

    const galleryUrls: string[] = [];
    const slots = ["", "-2", "-3"];

    for (const suffix of slots) {
      const fileName = `${prodSlug}${suffix}.png`;
      const filePath = join(catDir, fileName);
      if (existsSync(filePath)) {
        const buf = readFileSync(filePath);
        const publicId = `${catSlug}/${prodSlug}${suffix}`;
        try {
          const url = await uploadToCloudinary(buf, fileName, publicId);
          galleryUrls.push(url);
          console.log(`  ✓ Product '${prod.name}' slot '${suffix || "1"}' uploaded: ${url}`);
        } catch (err: any) {
          console.error(`  ✗ Failed product '${prod.name}' slot '${suffix || "1"}':`, err.message);
        }
      }
    }

    if (galleryUrls.length > 0) {
      await prisma.product.update({
        where: { id: prod.id },
        data: { images: galleryUrls },
      });
      for (const variant of prod.variants) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { imageUrl: galleryUrls[0] },
        });
      }
      updatedProductsCount++;
    } else {
      console.log(`  ! Product '${prod.name}' (slug: ${prodSlug}) had no local matching images in public/products/${catSlug}`);
    }
  }

  console.log(`\nDone! Updated ${updatedProductsCount} of ${activeProducts.length} active products with Cloudinary URLs.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
