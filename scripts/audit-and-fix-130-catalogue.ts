import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const allProducts = await prisma.product.findMany({
    include: { category: true, variants: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`=== FULL CATALOGUE AUDIT: ${allProducts.length} PRODUCTS ===\n`);

  // Target: exactly 130 verified real products
  // Let's filter and prioritize real products
  const auditResults: Array<{
    num: string;
    id: string;
    name: string;
    brand: string;
    sku: string;
    category: string;
    status: "PASS" | "FIX";
    issues: string[];
    images: string[];
  }> = [];

  const seenImages = new Map<string, string[]>();

  for (let i = 0; i < allProducts.length; i++) {
    const p = allProducts[i];
    const num = `Product ${String(i + 1).padStart(3, "0")}`;
    const issues: string[] = [];

    // Check images
    if (!p.images || p.images.length === 0) {
      issues.push("Missing primary image");
    }

    // Check for obvious mismatched images (e.g. makeup contour stick on hair color, hero banners in product cards)
    for (const img of p.images) {
      if (img.includes("hero_banner") || img.includes("banner")) {
        issues.push(`Contains banner instead of product photo: ${img}`);
      }
      if (p.category.name === "Hair Color & Treatment" && img.includes("contour_stick")) {
        issues.push(`Mismatched contour stick image on hair color: ${img}`);
      }
      if (p.category.name === "Hair Care" && img.includes("radiance_booster")) {
        issues.push(`Mismatched radiance booster on hair care: ${img}`);
      }
      if (p.category.name === "Makeup" && img.includes("barber_scissors")) {
        issues.push(`Mismatched barber scissors on makeup: ${img}`);
      }

      // Track duplicate usage
      const existing = seenImages.get(img) || [];
      existing.push(p.sku);
      seenImages.set(img, existing);
    }

    // Check brand
    if (!p.brand || p.brand.trim() === "") {
      issues.push("Missing brand");
    }

    // Check SKU
    if (!p.sku || p.sku.trim() === "") {
      issues.push("Missing SKU");
    }

    const status = issues.length === 0 ? "PASS" : "FIX";
    auditResults.push({
      num,
      id: p.id,
      name: p.name,
      brand: p.brand || "NO_BRAND",
      sku: p.sku,
      category: p.category.name,
      status,
      issues,
      images: p.images,
    });
  }

  // Print first 80 checklist items as required by prompt
  console.log("=== CHECKLIST (FIRST 80 PRODUCTS) ===");
  for (let i = 0; i < Math.min(80, auditResults.length); i++) {
    const item = auditResults[i];
    const issuesStr = item.issues.length > 0 ? ` (${item.issues.join("; ")})` : "";
    console.log(`${item.num}: [${item.sku}] ${item.brand} - ${item.name} → ${item.status}${issuesStr}`);
  }

  // Print duplicates
  console.log("\n=== DUPLICATE IMAGE USAGE ===");
  let dupCount = 0;
  for (const [img, skus] of seenImages.entries()) {
    if (skus.length > 1) {
      dupCount++;
      console.log(`Duplicate (${skus.length} products): ${img} -> SKUs: ${skus.join(", ")}`);
    }
  }
  console.log(`Total duplicate image URLs: ${dupCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
