import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import {
  getActiveCategories,
  getBrands,
  getPriceRange,
  searchProducts,
  type CatalogFilters,
} from "@/lib/catalog";
import { parseSort } from "@/lib/catalog-options";
import { ProductGrid } from "@/components/products/ProductCard";
import { ProductGridSkeleton } from "@/components/products/ProductGridSkeleton";
import { MobileFilters, ProductFilters } from "@/components/products/ProductFilters";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await prisma.category.findFirst({
    where: { slug: params.slug, isActive: true },
  });
  if (!category) return { title: "Category not found" };

  const description =
    category.description ??
    `Buy professional ${category.name.toLowerCase()} products at wholesale rates from ${siteConfig.brandName}.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      title: `${category.name} | ${siteConfig.brandName}`,
      description,
      url: `${siteConfig.siteUrl}/categories/${category.slug}`,
    },
  };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
function numeric(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** The database-bound part, streamed behind a Suspense boundary. */
async function Results({
  filters,
  searchParams,
  categorySlug,
}: {
  filters: CatalogFilters;
  searchParams: SearchParams;
  categorySlug: string;
}) {
  const result = await searchProducts(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-8 w-8" />}
        title="No products in this category match your filters"
        description="Try clearing the filters, or browse the full catalogue."
        action={<ButtonLink href={`/categories/${categorySlug}`}>Clear filters</ButtonLink>}
      />
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-500">
        Showing {result.items.length} of {result.total} product{result.total === 1 ? "" : "s"}
      </p>
      <ProductGrid products={result.items} />
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        baseParams={searchParams}
        basePath={`/categories/${categorySlug}`}
      />
    </>
  );
}


export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: SearchParams;
}) {
  const category = await prisma.category.findFirst({
    where: { slug: params.slug, isActive: true },
  });
  if (!category) notFound();

  const brands = many(searchParams.brand);
  const min = numeric(first(searchParams.min));
  const max = numeric(first(searchParams.max));
  const stock = first(searchParams.stock) === "1";
  const wholesale = first(searchParams.wholesale) === "1";
  const sort = parseSort(first(searchParams.sort));
  const page = Math.max(1, numeric(first(searchParams.page)) ?? 1);

  const [categories, brandList, priceRange] = await Promise.all([
    getActiveCategories(),
    getBrands(),
    getPriceRange(),
  ]);

  const filters: CatalogFilters = {
    category: category.slug,
    brands,
    minPrice: min,
    maxPrice: max,
    inStockOnly: stock,
    wholesaleOnly: wholesale,
    sort,
    page,
  };

  const filterProps = {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    brands: brandList,
    priceRange,
    basePath: `/categories/${category.slug}`,
    lockedCategory: category.slug,
    state: {
      brands,
      min: first(searchParams.min),
      max: first(searchParams.max),
      stock,
      wholesale,
      sort,
    },
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/categories" className="hover:text-brand-700">Categories</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-900">{category.name}</span>
      </nav>

      <PageHeader
        title={category.name}
        description={
          category.description ?? "Professional supplies for your business at wholesale rates."
        }
      />

      <div className="mb-6 lg:hidden">
        <MobileFilters {...filterProps} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-xl border border-slate-200 bg-white p-5">
            <ProductFilters {...filterProps} />
          </div>
        </aside>

        <div>
          <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
            <Results filters={filters} searchParams={searchParams} categorySlug={category.slug} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
