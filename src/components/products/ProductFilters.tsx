"use client";

import Link from "next/link";
import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Field, Input, Label } from "@/components/ui";
import { SORT_OPTIONS } from "@/lib/catalog-options";

export interface FilterState {
  q?: string;
  category?: string;
  brands: string[];
  min?: string;
  max?: string;
  stock?: boolean;
  wholesale?: boolean;
  sort?: string;
}

/**
 * A plain GET form — the URL stays the single source of truth for filter
 * state, so results are shareable and the back button works. The only
 * client-side behaviour is auto-submitting when a control changes.
 */
export function ProductFilters({
  categories,
  brands,
  priceRange,
  state,
  basePath = "/products",
  lockedCategory,
}: {
  categories: { name: string; slug: string }[];
  brands: string[];
  priceRange: { min: number; max: number };
  state: FilterState;
  basePath?: string;
  lockedCategory?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form ref={formRef} action={basePath} className="space-y-6">
      {/* Preserve the search term across filter changes. */}
      {state.q && <input type="hidden" name="q" value={state.q} />}
      {lockedCategory && <input type="hidden" name="category" value={lockedCategory} />}

      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <SlidersHorizontal className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        <Link
          href={
            lockedCategory
              ? basePath
              : state.q
                ? `${basePath}?q=${encodeURIComponent(state.q)}`
                : basePath
          }
          className="ml-auto text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          Clear all
        </Link>
      </div>

      <div>
        <Label htmlFor="sort">Sort by</Label>
        <select
          id="sort"
          name="sort"
          defaultValue={state.sort ?? "newest"}
          onChange={submit}
          className="input-base"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {!lockedCategory && (
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={state.category ?? ""}
            onChange={submit}
            className="input-base"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Price range (₹)</legend>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            name="min"
            min={0}
            placeholder={String(priceRange.min)}
            defaultValue={state.min ?? ""}
            aria-label="Minimum price"
          />
          <span className="text-slate-400">–</span>
          <Input
            type="number"
            name="max"
            min={0}
            placeholder={String(priceRange.max)}
            defaultValue={state.max ?? ""}
            aria-label="Maximum price"
          />
        </div>
        <button
          type="submit"
          className="mt-2 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          Apply price range
        </button>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Availability</legend>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="stock"
              value="1"
              defaultChecked={state.stock}
              onChange={submit}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            In stock only
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="wholesale"
              value="1"
              defaultChecked={state.wholesale}
              onChange={submit}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
            />
            Wholesale pricing available
          </label>
        </div>
      </fieldset>

      {brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Brand</legend>
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {brands.map((brand) => (
              <label
                key={brand}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  name="brand"
                  value={brand}
                  defaultChecked={state.brands.includes(brand)}
                  onChange={submit}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                />
                {brand}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Keeps the form usable if JavaScript has not loaded. */}
      <button
        type="submit"
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Apply Filters
      </button>
    </form>
  );
}

/** Collapsible wrapper so filters do not eat the screen on mobile. */
export function MobileFilters(props: Parameters<typeof ProductFilters>[0]) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-900">
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        Filters &amp; Sorting
      </summary>
      <div className="mt-4">
        <ProductFilters {...props} />
      </div>
    </details>
  );
}
