import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const metadata: Metadata = { title: "Media Library" };

/**
 * Every product image in one place.
 *
 * The products list shows only the first view, which hides the two behind it —
 * so a product could carry a duplicate, a placeholder or a gap in slots 2 and 3
 * and nothing in the admin would say so. This shows all three for every
 * product, labelled by where the image came from.
 */
export default async function AdminMediaPage() {
  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { brand: "asc" }, { name: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      brand: true,
      isActive: true,
      images: true,
      category: { select: { name: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Every gallery view for every product, tagged by source. Real photography is the goal — anything marked AI-generated is a placeholder waiting to be replaced."
      />

      <MediaLibrary
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          categoryName: p.category.name,
          isActive: p.isActive,
          images: p.images,
        }))}
      />
    </>
  );
}
