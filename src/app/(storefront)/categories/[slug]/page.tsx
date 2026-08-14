import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
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
import { ButtonLink, EmptyState } from "@/components/ui";

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
      images: category.imageUrl ? [{ url: category.imageUrl }] : undefined,
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
      <p className="mb-5 text-sm font-medium text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-800">{result.items.length}</span> of{" "}
        <span className="font-semibold text-slate-800">{result.total}</span>{" "}
        product{result.total === 1 ? "" : "s"}
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
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  if (!category) notFound();

  const brands = many(searchParams.brand);
  const min = numeric(first(searchParams.min));
  const max = numeric(first(searchParams.max));
  const stock = first(searchParams.stock) === "1";
  const wholesale = first(searchParams.wholesale) === "1";
  const sort = parseSort(first(searchParams.sort));
  const page = Math.max(1, numeric(first(searchParams.page)) ?? 1);
  const q = first(searchParams.q)?.trim();

  const [categories, brandList, priceRange] = await Promise.all([
    getActiveCategories(),
    getBrands(),
    getPriceRange(),
  ]);

  const filters: CatalogFilters = {
    q,
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
      q,
      brands,
      min: first(searchParams.min),
      max: first(searchParams.max),
      stock,
      wholesale,
      sort,
    },
  };

  return (
    <>
      {/* ── Category hero banner ──────────────────────────── */}
      <div className="relative border-b border-slate-200">
        {/* Background image */}
        {category.imageUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
          </div>
        )}
        {!category.imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700" />
        )}

        <div className="container-page relative py-12 sm:py-16">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-white/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white/90 transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/categories" className="hover:text-white/90 transition-colors">Categories</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/90">{category.name}</span>
          </nav>

          <h1 className="text-3xl font-bold text-white sm:text-4xl">{category.name}</h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              {category.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm ring-1 ring-white/20">
              {category._count.products} products
            </span>
          </div>

          {/* In-category search */}
          <form
            action={`/categories/${category.slug}`}
            className="mt-6 flex max-w-lg overflow-hidden rounded-xl shadow-lg"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder={`Search in ${category.name}…`}
                aria-label={`Search ${category.name} products`}
                className="h-12 w-full border-0 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ── Products ──────────────────────────────────────── */}
      <div className="container-page py-8 sm:py-10">
        {/* Mobile filters */}
        <div className="mb-6 lg:hidden">
          <MobileFilters {...filterProps} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-32 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <ProductFilters {...filterProps} />
            </div>
          </aside>

          {/* Results */}
          <div>
            <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
              <Results filters={filters} searchParams={searchParams} categorySlug={category.slug} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
