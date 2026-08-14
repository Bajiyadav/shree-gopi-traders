"use client";

import Link from "next/link";
import { useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
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

  // Count active non-sort filters
  const activeFilterCount = [
    state.category && !lockedCategory,
    state.brands.length > 0,
    state.min,
    state.max,
    state.stock,
    state.wholesale,
  ].filter(Boolean).length;

  const clearHref = lockedCategory
    ? basePath
    : state.q
      ? `${basePath}?q=${encodeURIComponent(state.q)}`
      : basePath;

  return (
    <form ref={formRef} action={basePath} className="space-y-5">
      {/* Preserve the search term across filter changes. */}
      {state.q && <input type="hidden" name="q" value={state.q} />}
      {lockedCategory && <input type="hidden" name="category" value={lockedCategory} />}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        {activeFilterCount > 0 && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
        {activeFilterCount > 0 && (
          <Link
            href={clearHref}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            <X className="h-3 w-3" />
            Clear all
          </Link>
        )}
        {activeFilterCount === 0 && (
          <Link
            href={clearHref}
            className="ml-auto text-xs font-medium text-slate-400"
          >
            Clear all
          </Link>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {state.category && !lockedCategory && (() => {
            const cat = categories.find((c) => c.slug === state.category);
            const href = state.q ? `${basePath}?q=${encodeURIComponent(state.q)}` : basePath;
            return cat ? (
              <Link
                key="chip-cat"
                href={href}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
              >
                {cat.name} <X className="h-3 w-3" />
              </Link>
            ) : null;
          })()}
          {state.brands.map((brand) => {
            const params = new URLSearchParams();
            if (state.q) params.set("q", state.q);
            if (state.category) params.set("category", state.category);
            state.brands.filter((b) => b !== brand).forEach((b) => params.append("brand", b));
            if (state.min) params.set("min", state.min);
            if (state.max) params.set("max", state.max);
            if (state.stock) params.set("stock", "1");
            if (state.wholesale) params.set("wholesale", "1");
            if (state.sort) params.set("sort", state.sort);
            return (
              <Link
                key={`chip-brand-${brand}`}
                href={`${basePath}?${params}`}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
              >
                {brand} <X className="h-3 w-3" />
              </Link>
            );
          })}
          {(state.min || state.max) && (() => {
            const params = new URLSearchParams();
            if (state.q) params.set("q", state.q);
            if (state.category) params.set("category", state.category);
            state.brands.forEach((b) => params.append("brand", b));
            if (state.stock) params.set("stock", "1");
            if (state.wholesale) params.set("wholesale", "1");
            if (state.sort) params.set("sort", state.sort);
            return (
              <Link
                href={`${basePath}?${params}`}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
              >
                ₹{state.min ?? "0"}–{state.max ?? "∞"} <X className="h-3 w-3" />
              </Link>
            );
          })()}
          {state.stock && (() => {
            const params = new URLSearchParams();
            if (state.q) params.set("q", state.q);
            if (state.category) params.set("category", state.category);
            state.brands.forEach((b) => params.append("brand", b));
            if (state.min) params.set("min", state.min);
            if (state.max) params.set("max", state.max);
            if (state.wholesale) params.set("wholesale", "1");
            if (state.sort) params.set("sort", state.sort);
            return (
              <Link
                href={`${basePath}?${params}`}
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
              >
                In Stock <X className="h-3 w-3" />
              </Link>
            );
          })()}
          {state.wholesale && (() => {
            const params = new URLSearchParams();
            if (state.q) params.set("q", state.q);
            if (state.category) params.set("category", state.category);
            state.brands.forEach((b) => params.append("brand", b));
            if (state.min) params.set("min", state.min);
            if (state.max) params.set("max", state.max);
            if (state.stock) params.set("stock", "1");
            if (state.sort) params.set("sort", state.sort);
            return (
              <Link
                href={`${basePath}?${params}`}
                className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
              >
                Wholesale <X className="h-3 w-3" />
              </Link>
            );
          })()}
        </div>
      )}

      {/* Sort */}
      <div>
        <Label htmlFor="sort">Sort by</Label>
        <select
          id="sort"
          name="sort"
          defaultValue={state.sort ?? "newest"}
          onChange={submit}
          className="input-base mt-1"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category */}
      {!lockedCategory && (
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={state.category ?? ""}
            onChange={submit}
            className="input-base mt-1"
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

      {/* Price range */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Price range (₹)</legend>
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

      {/* Availability */}
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

      {/* Brands */}
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

      {/* Submit fallback */}
      <button
        type="submit"
        className="w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
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
        {/* Active filter count */}
        {[
          props.state.category && !props.lockedCategory,
          props.state.brands.length > 0,
          props.state.min,
          props.state.max,
          props.state.stock,
          props.state.wholesale,
        ].filter(Boolean).length > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
            {[
              props.state.category && !props.lockedCategory,
              props.state.brands.length > 0,
              props.state.min,
              props.state.max,
              props.state.stock,
              props.state.wholesale,
            ].filter(Boolean).length}
          </span>
        )}
      </summary>
      <div className="mt-4">
        <ProductFilters {...props} />
      </div>
    </details>
  );
}
