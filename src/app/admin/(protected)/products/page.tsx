import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Package, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteProductAction, toggleProductAction } from "@/actions/products";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { ActionButton, FilterSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; status?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const categorySlug = searchParams.category;
  const status = searchParams.status;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  const where: Prisma.ProductWhereInput = {
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(status === "ACTIVE" ? { isActive: true } : status === "INACTIVE" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { brand: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
        variants: {
          select: { id: true, isActive: true, inventory: { select: { stock: true } } },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        action={
          <ButtonLink href="/admin/products/new">
            <Plus className="h-4 w-4" />
            New Product
          </ButtonLink>
        }
      />

      <Toolbar
        action="/admin/products"
        searchValue={q}
        searchPlaceholder="Search by name, SKU or brand…"
      >
        <select
          name="category"
          defaultValue={categorySlug ?? ""}
          className="input-base w-auto min-w-40"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <FilterSelect
          name="status"
          value={status}
          options={["ACTIVE", "INACTIVE"]}
          placeholder="All statuses"
          label="Filter by status"
        />
      </Toolbar>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products found"
          description="Adjust the filters, or create your first product."
          action={<ButtonLink href="/admin/products/new">New Product</ButtonLink>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Variants</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const stock = product.variants.reduce(
                    (sum, v) => sum + (v.inventory?.stock ?? 0),
                    0
                  );
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <Image
                              src={product.images[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cpath d='M160 100h80v80h-80z' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linejoin='round'/%3E%3Ccircle cx='180' cy='120' r='8' fill='%23cbd5e1'/%3E%3Cpath d='M160 170l30-30 20 20 15-15 35 35' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="font-medium text-slate-900 hover:text-brand-700"
                            >
                              {product.name}
                            </Link>
                            <p className="text-xs text-slate-500">{product.brand ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.category.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatCurrency(Number(product.basePrice), { decimals: false })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {product.variants.length}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={stock === 0 ? "font-medium text-red-600" : "text-slate-700"}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={product.isActive ? "success" : "neutral"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <ButtonLink
                            href={`/admin/products/${product.id}`}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </ButtonLink>
                          <ActionButton
                            action={toggleProductAction}
                            fields={{ id: product.id }}
                            variant="ghost"
                          >
                            {product.isActive ? "Deactivate" : "Activate"}
                          </ActionButton>
                          <ActionButton
                            action={deleteProductAction}
                            fields={{ id: product.id }}
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            confirm={`Delete "${product.name}"? Products that appear in past orders are deactivated instead.`}
                          >
                            Delete
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        baseParams={searchParams as Record<string, string | undefined>}
        basePath="/admin/products"
      />
    </>
  );
}
