import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <>
      <PageHeader
        title="Categories"
        description="The storefront navigation reads directly from this list — nothing is hardcoded in the UI."
      />

      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description ?? "",
          imageUrl: c.imageUrl ?? "",
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          productCount: c._count.products,
        }))}
      />
    </>
  );
}
