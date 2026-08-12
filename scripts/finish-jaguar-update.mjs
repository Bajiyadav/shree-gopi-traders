import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== FINISHING JAGUAR PRE STYLE RELAX SLICE SCISSORS UPDATE ===");

  const productId = "cmslgilcq00lyb48jenukboho";
  const img1 = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786486285/shree-gopi-traders/products/barber-supplies/jaguar-pre-style-relax-slice-scissors-1.png";
  const img2 = "https://res.cloudinary.com/dg8z7pxju/image/upload/v1786486287/shree-gopi-traders/products/barber-supplies/jaguar-pre-style-relax-slice-scissors-2.png";

  // Update Product
  await prisma.product.update({
    where: { id: productId },
    data: {
      name: "Jaguar Pre Style Relax Slice Hairdressing Scissors",
      slug: "jaguar-pre-style-relax-slice-hairdressing-scissors",
      sku: "SGT-JAGUAR-RELAX-SLICE",
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
      salePrice: null,
      images: [img1, img2],
    },
  });

  // Delete redundant second variant
  await prisma.wholesalePriceTier.deleteMany({
    where: { productVariant: { productId: productId } },
  });

  await prisma.productVariant.deleteMany({
    where: {
      productId: productId,
      id: { not: "cmslgilcq00lzb48j2s2030o8" },
    },
  });

  // Update primary variant
  await prisma.productVariant.update({
    where: { id: "cmslgilcq00lzb48j2s2030o8" },
    data: {
      name: "5.5 Inch Satin Scissors",
      sku: "SGT-JAGUAR-RELAX-SLICE-55",
      price: "4850",
      salePrice: null,
      imageUrl: img1,
      isActive: true,
    },
  });

  // Re-create wholesale tiers
  await prisma.wholesalePriceTier.createMany({
    data: [
      { productVariantId: "cmslgilcq00lzb48j2s2030o8", minQty: 1, maxQty: 4, pricePerUnit: "4850" },
      { productVariantId: "cmslgilcq00lzb48j2s2030o8", minQty: 5, maxQty: 9, pricePerUnit: "4350" },
      { productVariantId: "cmslgilcq00lzb48j2s2030o8", minQty: 10, maxQty: null, pricePerUnit: "3900" },
    ],
  });

  console.log("Successfully cleaned and updated Jaguar Scissors!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
