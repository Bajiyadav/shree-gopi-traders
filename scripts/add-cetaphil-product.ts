import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding Cetaphil Gentle Skin Cleanser to Shree Gopi Traders...");

  // 1. Find Skin Care category
  const category = await prisma.category.findUnique({
    where: { slug: "skin-care" },
  });

  if (!category) {
    throw new Error("Skin Care category not found in database!");
  }

  // 2. Generate unique SKU
  const existingCount = await prisma.product.count({
    where: { categoryId: category.id },
  });
  const sku = `SGT-SK-${String(existingCount + 1).padStart(3, "0")}`;

  const slug = "cetaphil-gentle-skin-cleanser";
  const imagePaths = [
    `/products/skin-care/${slug}.png`,
    `/products/skin-care/${slug}-2.png`,
    `/products/skin-care/${slug}-3.png`,
  ];

  // 3. Create or update product record in DB
  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      name: "Cetaphil Gentle Skin Cleanser",
      brand: "Cetaphil",
      description:
        "Cetaphil Gentle Skin Hydrating Face Wash. Paraben-free, sulphate-free gentle skin hydrating cleanser formulated with Niacinamide, Vitamin B5 and Hydrating Glycerin for dry to normal, sensitive skin. Cleanses without stripping natural moisture, soothing skin and maintaining the protective moisture barrier.",
      specs: {
        "Product Type": "Gentle Face Cleanser",
        Formulation: "Sulphate-Free, Paraben-Free",
        "Key Ingredients": "Niacinamide, Vitamin B5, Hydrating Glycerin",
        "Skin Type": "Dry to Normal, Sensitive Skin",
        "Net Quantity": "118ml / 500ml",
        "Professional Use": "Professional / salon use",
      },
      images: imagePaths,
      isActive: true,
      basePrice: 335,
    },
    create: {
      name: "Cetaphil Gentle Skin Cleanser",
      slug,
      brand: "Cetaphil",
      sku,
      description:
        "Cetaphil Gentle Skin Hydrating Face Wash. Paraben-free, sulphate-free gentle skin hydrating cleanser formulated with Niacinamide, Vitamin B5 and Hydrating Glycerin for dry to normal, sensitive skin. Cleanses without stripping natural moisture, soothing skin and maintaining the protective moisture barrier.",
      specs: {
        "Product Type": "Gentle Face Cleanser",
        Formulation: "Sulphate-Free, Paraben-Free",
        "Key Ingredients": "Niacinamide, Vitamin B5, Hydrating Glycerin",
        "Skin Type": "Dry to Normal, Sensitive Skin",
        "Net Quantity": "118ml / 500ml",
        "Professional Use": "Professional / salon use",
      },
      images: imagePaths,
      isActive: true,
      basePrice: 335,
      categoryId: category.id,
    },
  });

  console.log(`Product upserted: ${product.name} (${product.id})`);

  // 4. Create or update variants
  const variantsData = [
    { name: "118ml", price: 335, sku: `${sku}-118` },
    { name: "500ml", price: 995, sku: `${sku}-500` },
  ];

  for (const v of variantsData) {
    const variant = await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        name: v.name,
        price: v.price,
        productId: product.id,
        isActive: true,
      },
      create: {
        name: v.name,
        sku: v.sku,
        price: v.price,
        productId: product.id,
        isActive: true,
      },
    });

    // Inventory
    await prisma.inventory.upsert({
      where: { productVariantId: variant.id },
      update: { stock: 150, lowStockThreshold: 15 },
      create: { productVariantId: variant.id, stock: 150, lowStockThreshold: 15 },
    });

    // Wholesale Tiers
    await prisma.wholesalePriceTier.deleteMany({ where: { productVariantId: variant.id } });
    const tiers = [
      { minQty: 1, maxQty: 4, discountFraction: 0 },
      { minQty: 5, maxQty: 9, discountFraction: 0.07 },
      { minQty: 10, maxQty: 24, discountFraction: 0.13 },
      { minQty: 25, maxQty: null, discountFraction: 0.20 },
    ];
    for (const t of tiers) {
      await prisma.wholesalePriceTier.create({
        data: {
          productVariantId: variant.id,
          minQty: t.minQty,
          maxQty: t.maxQty,
          pricePerUnit: Math.round(v.price * (1 - t.discountFraction) * 100) / 100,
        },
      });
    }
  }

  // 5. Generate high resolution studio photos (White bottle with blue cap & Cetaphil style label)
  const dir = path.join(process.cwd(), "public/products/skin-care");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const renderPhoto = async (filePath: string, angleName: string, rotationDeg: number) => {
    const svg = `
<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </radialGradient>
    <linearGradient id="studioHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
      <stop offset="25%" stop-color="#ffffff" stop-opacity="0.1"/>
      <stop offset="75%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="40%" stop-color="#ffffff"/>
      <stop offset="80%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="capBlue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>

  <rect width="1000" height="1000" fill="url(#bgGrad)"/>
  <ellipse cx="500" cy="790" rx="230" ry="35" fill="#0f172a" opacity="0.2" filter="blur(12px)"/>

  <g transform="translate(500, 500) rotate(${rotationDeg}) translate(-500, -500)">
    <!-- Main Bottle Body -->
    <g transform="translate(350, 240)">
      <!-- Pump Cap -->
      <rect x="70" y="20" width="160" height="90" rx="15" fill="url(#capBlue)"/>
      <rect x="70" y="20" width="160" height="90" rx="15" fill="url(#studioHighlight)" opacity="0.3"/>
      <rect x="90" y="0" width="120" height="30" rx="8" fill="#38bdf8"/>

      <!-- Bottle Neck -->
      <rect x="80" y="100" width="140" height="60" rx="10" fill="url(#bottleGrad)"/>

      <!-- Bottle Body (Rounded Cetaphil shape) -->
      <path d="M 20 160 Q 0 160 0 190 L 0 540 Q 0 580 40 580 L 260 580 Q 300 580 300 540 L 300 190 Q 300 160 280 160 Z" fill="url(#bottleGrad)"/>
      <path d="M 20 160 Q 0 160 0 190 L 0 540 Q 0 580 40 580 L 260 580 Q 300 580 300 540 L 300 190 Q 300 160 280 160 Z" fill="url(#studioHighlight)" opacity="0.4"/>

      <!-- Cetaphil Style Oval Logo & Label -->
      <rect x="25" y="200" width="250" height="320" rx="20" fill="#ffffff" opacity="0.98"/>
      <ellipse cx="150" cy="270" rx="100" ry="45" fill="#84cc16"/>
      <ellipse cx="150" cy="270" rx="95" ry="40" fill="#0284c7"/>
      <text x="150" y="280" font-family="'Arial Black', sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle">Cetaphil</text>

      <text x="150" y="345" font-family="'Inter', sans-serif" font-weight="bold" font-size="20" fill="#0284c7" text-anchor="middle">Gentle Skin</text>
      <text x="150" y="375" font-family="'Inter', sans-serif" font-weight="bold" font-size="20" fill="#0284c7" text-anchor="middle">Cleanser</text>

      <rect x="40" y="395" width="220" height="2" fill="#0284c7"/>
      <text x="150" y="420" font-family="sans-serif" font-size="12" fill="#334155" text-anchor="middle">Dry to Normal, Sensitive Skin</text>
      <text x="150" y="445" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">Hydrates with Niacinamide &amp; B5</text>
      <text x="150" y="495" font-family="sans-serif" font-weight="bold" font-size="13" fill="#0f172a" text-anchor="middle">${angleName} • 118 ml</text>
    </g>
  </g>
</svg>`;

    await sharp(Buffer.from(svg)).png().toFile(filePath);
    console.log(`Rendered image: ${filePath}`);
  };

  await renderPhoto(path.join(process.cwd(), "public", imagePaths[0]), "FRONT VIEW", 0);
  await renderPhoto(path.join(process.cwd(), "public", imagePaths[1]), "SIDE PERSPECTIVE", -8);
  await renderPhoto(path.join(process.cwd(), "public", imagePaths[2]), "DETAIL ANGLE", 8);

  console.log("Applying SGT ORIGINAL brand badge pixels...");
  execSync("node scripts/imaging/apply-sgt-badge.mjs", { stdio: "inherit" });

  console.log("Cetaphil Gentle Skin Cleanser successfully added!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
