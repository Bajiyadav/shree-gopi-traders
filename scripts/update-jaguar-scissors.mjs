import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== UPDATING JAGUAR PRE STYLE RELAX SLICE SCISSORS ===");

  const cloudinaryUrls = [
    "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786486285/shree-gopi-traders/products/barber-supplies/jaguar-pre-style-relax-slice-scissors-1.png",
    "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786486287/shree-gopi-traders/products/barber-supplies/jaguar-pre-style-relax-slice-scissors-2.png",
  ];

  const category = await prisma.category.findUnique({
    where: { slug: "barber-supplies" },
  });

  if (!category) {
    throw new Error("Barber Supplies category not found in database!");
  }

  const productSku = "SGT-JAGUAR-RELAX-SLICE";
  const variantSku = "SGT-JAGUAR-RELAX-SLICE-55";
  const slug = "jaguar-pre-style-relax-slice-hairdressing-scissors";

  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { sku: productSku },
        { slug: slug },
        { id: "cmslgilcq00lyb48jenukboho" },
      ],
    },
    include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
  });

  if (product) {
    console.log(`Updating existing product '${product.name}' (ID: ${product.id})...`);
    product = await prisma.product.update({
      where: { id: product.id },
      data: {
        name: "Jaguar Pre Style Relax Slice Hairdressing Scissors",
        slug: slug,
        sku: productSku,
        brand: "Jaguar",
        description: "Professional German-engineered Jaguar Pre Style Relax Slice hairdressing scissors. Forged from high-grade stainless steel with satin finish, micro-serrated sliced blade edge for crisp effortless cutting, ergonomic offset handles for relaxed hand position, and adjustable tension screw with gold removable finger rest.",
        specs: JSON.stringify({
          "Blade Material": "High-Grade Stainless Steel (Satin Finish)",
          "Blade Edge": "Micro-serrated Sliced Blade",
          "Handle Design": "Offset Ergonomic Position",
          "Tension": "Vario Adjustable Screw with Gold Accent",
          "Finger Rest": "Removable Gold Finger Rest",
          "Origin": "Made in Solingen, Germany"
        }),
        basePrice: "4850",
        images: cloudinaryUrls,
        updatedAt: new Date(),
      },
      include: { variants: { include: { inventory: true, wholesaleTiers: true } } },
    });

    for (const v of product.variants) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: {
          name: "5.5 Inch Satin Scissors",
          sku: variantSku,
          price: "4850",
          imageUrl: cloudinaryUrls[0],
        },
      });

      await prisma.wholesalePriceTier.deleteMany({
        where: { productVariantId: v.id },
      });

      await prisma.wholesalePriceTier.createMany({
        data: [
          { productVariantId: v.id, minQty: 1, maxQty: 4, pricePerUnit: "4850" },
          { productVariantId: v.id, minQty: 5, maxQty: 9, pricePerUnit: "4350" },
          { productVariantId: v.id, minQty: 10, maxQty: null, pricePerUnit: "3900" },
        ],
      });
    }
  }

  console.log("Successfully updated product!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
