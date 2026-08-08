import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";
import { VariantManager } from "@/components/admin/VariantManager";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          orderBy: { createdAt: "asc" },
          include: { inventory: true, wholesaleTiers: true },
        },
      },
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }], select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/products" className="hover:text-brand-700">
          ← Back to products
        </Link>
      </nav>

      <PageHeader
        title={product.name}
        description={`SKU ${product.sku}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={product.isActive ? "success" : "neutral"}>
              {product.isActive ? "Active" : "Inactive"}
            </Badge>
            <ButtonLink href={`/products/${product.slug}`} variant="outline" size="sm">
              View on storefront
            </ButtonLink>
          </div>
        }
      />

      <div className="space-y-6">
        <Card className="max-w-4xl p-6">
          <h2 className="mb-5 text-base font-semibold">Product Details</h2>
          <ProductForm
            categories={categories}
            values={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description ?? "",
              brand: product.brand ?? "",
              sku: product.sku,
              categoryId: product.categoryId,
              images: product.images.join("\n"),
              basePrice: String(product.basePrice),
              salePrice: product.salePrice === null ? "" : String(product.salePrice),
              weight: product.weight === null ? "" : String(product.weight),
              isActive: product.isActive,
              allowBackorder: product.allowBackorder,
            }}
          />
        </Card>

        <VariantManager
          productId={product.id}
          variants={product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: Number(v.price),
            salePrice: v.salePrice === null ? null : Number(v.salePrice),
            weight: v.weight === null ? null : Number(v.weight),
            imageUrl: v.imageUrl,
            isActive: v.isActive,
            stock: v.inventory?.stock ?? 0,
            lowStockThreshold: v.inventory?.lowStockThreshold ?? 5,
            tiers: v.wholesaleTiers.map((t) => ({
              id: t.id,
              minQty: t.minQty,
              maxQty: t.maxQty,
              pricePerUnit: Number(t.pricePerUnit),
            })),
          }))}
        />
      </div>
    </>
  );
}
