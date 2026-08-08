import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { Alert, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/products" className="hover:text-brand-700">
          ← Back to products
        </Link>
      </nav>

      <PageHeader
        title="New Product"
        description="Create the product, then add its variants and wholesale tiers."
      />

      <Alert tone="info" className="mb-5">
        A default &ldquo;Standard&rdquo; variant with a 1+ wholesale tier is created automatically —
        edit or replace it after saving.
      </Alert>

      <Card className="max-w-4xl p-6">
        <ProductForm
          categories={categories}
          values={{
            name: "",
            slug: "",
            description: "",
            brand: "",
            sku: "",
            categoryId: categories[0]?.id ?? "",
            images: "",
            basePrice: "",
            salePrice: "",
            weight: "",
            isActive: true,
            allowBackorder: false,
          }}
        />
      </Card>
    </>
  );
}
