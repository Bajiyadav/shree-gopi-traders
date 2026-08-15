import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Find all MDM brand products
  const mdmProducts = await prisma.product.findMany({
    where: { brand: { contains: "MDM", mode: "insensitive" } },
    select: { id: true, name: true, brand: true, slug: true, images: true, sku: true },
    orderBy: { name: "asc" },
  });

  console.log(`\n=== MDM Brand Products (${mdmProducts.length}) ===`);
  for (const p of mdmProducts) {
    console.log(`\nName   : ${p.name}`);
    console.log(`SKU    : ${p.sku}`);
    console.log(`Brand  : ${p.brand}`);
    console.log(`Images : ${p.images.length} → ${JSON.stringify(p.images)}`);
  }

  // Also find products that have MDM in their name
  const mdmNameProducts = await prisma.product.findMany({
    where: {
      name: { contains: "MDM", mode: "insensitive" },
      brand: { not: { contains: "MDM", mode: "insensitive" } },
    },
    select: { id: true, name: true, brand: true, slug: true, images: true, sku: true },
  });

  if (mdmNameProducts.length > 0) {
    console.log(`\n=== Products with MDM in name but different brand (${mdmNameProducts.length}) ===`);
    for (const p of mdmNameProducts) {
      console.log(`\nName   : ${p.name}`);
      console.log(`Brand  : ${p.brand}`);
      console.log(`Images : ${JSON.stringify(p.images)}`);
    }
  }

  // Find products whose images contain "mdm" in the path
  const productsWithMdmImages = await prisma.product.findMany({
    where: { images: { hasSome: [] } },
    select: { id: true, name: true, brand: true, images: true },
  });

  // Filter in JS for image paths containing mdm
  const withMdmImg = productsWithMdmImages.filter(p =>
    p.images.some(img => img.toLowerCase().includes("mdm"))
  );

  if (withMdmImg.length > 0) {
    console.log(`\n=== Products whose image paths contain 'mdm' (${withMdmImg.length}) ===`);
    for (const p of withMdmImg) {
      console.log(`\nName   : ${p.name}`);
      console.log(`Brand  : ${p.brand}`);
      console.log(`Images : ${JSON.stringify(p.images)}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
