/**
 * Client-safe catalogue constants.
 *
 * These live outside `catalog.ts` on purpose: that module is `server-only`
 * (it holds raw SQL and the Prisma client), and the filter UI is a Client
 * Component. Sharing the sort vocabulary here keeps the server query and the
 * dropdown in agreement without dragging the database into the browser bundle.
 */

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Best Rated" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const SORT_VALUES: readonly string[] = SORT_OPTIONS.map((o) => o.value);

export function parseSort(value: string | undefined): SortValue {
  return (SORT_VALUES.includes(value ?? "") ? value : "newest") as SortValue;
}

export const PAGE_SIZE = 12;
