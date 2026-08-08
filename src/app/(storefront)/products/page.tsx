import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
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
      <p className="mb-4 text-sm text-slate-500">
        Showing {result.items.length} of {result.total} product
        {result.total === 1 ? "" : "s"}
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
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title={q ? `Search results for “${q}”` : activeCategory ? activeCategory.name : "All Products"}
        description={
          q
            ? "Products matching your search across names, brands, SKUs and descriptions."
            : "Professional salon and parlour supplies at wholesale rates."
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
          {/* Keyed on the filter set so changing a filter re-triggers the fallback. */}
          <Suspense key={JSON.stringify(filters)} fallback={<ProductGridSkeleton />}>
            <Results filters={filters} searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
