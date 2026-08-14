import type { Metadata } from "next";
import { Suspense } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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
import Link from "next/link";

export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse professional salon, parlour, spa and beauty supplies at wholesale rates — hair care, equipment, skincare, nails, waxing, makeup, furniture and consumables.",
  alternates: { canonical: "/products" },
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

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

/** The part that hits the database, so it can stream behind a Suspense boundary. */
async function Results({
  filters,
  searchParams,
}: {
  filters: CatalogFilters;
  searchParams: SearchParams;
}) {
  const result = await searchProducts(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-8 w-8" />}
        title="No products match your filters"
        description="Try widening your price range, clearing a filter, or searching for a different term."
        action={<ButtonLink href="/products">Clear all filters</ButtonLink>}
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
        basePath="/products"
      />
    </>
  );
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const q = first(searchParams.q)?.trim();
  const category = first(searchParams.category);
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
    q,
    category,
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
    state: {
      q,
      category,
      brands,
      min: first(searchParams.min),
      max: first(searchParams.max),
      stock,
      wholesale,
      sort,
    },
  };

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <>
      {/* ── Search hero ──────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        <div className="container-page py-10 sm:py-12">
          <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
            {q
              ? `Results for "${q}"`
              : activeCategory
                ? activeCategory.name
                : "All Products"}
          </h1>
          <p className="mb-6 text-sm text-brand-200">
            {q
              ? "Products matching your search across names, brands, SKUs and descriptions."
              : "Professional salon and parlour supplies at wholesale rates."}
          </p>

          {/* Big search bar */}
          <form action="/products" className="flex max-w-2xl overflow-hidden rounded-xl shadow-lg">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search products, brands, categories…"
                aria-label="Search products"
                className="h-14 w-full border-0 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
            </div>
            <select
              name="category"
              aria-label="Search within category"
              defaultValue={category ?? ""}
              className="hidden border-0 border-l border-slate-200 bg-white py-0 pl-3 pr-8 text-sm text-slate-600 focus:outline-none focus:ring-0 sm:block"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="flex w-16 items-center justify-center bg-brand-500 text-white transition-colors hover:bg-brand-400"
              aria-label="Search"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>

          {/* Quick-category pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/products"
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                !category
                  ? "bg-white text-brand-800 shadow-sm"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              All
            </Link>
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === c.slug
                    ? "bg-white text-brand-800 shadow-sm"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────── */}
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
            {/* Keyed on the filter set so changing a filter re-triggers the fallback. */}
            <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
              <Results filters={filters} searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
