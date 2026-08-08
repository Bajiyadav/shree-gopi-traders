import { Skeleton } from "@/components/ui";

/**
 * Fallback for the in-page Suspense boundary around a product grid.
 *
 * This deliberately lives inside the page rather than in a route-level
 * `loading.tsx`: a route-level boundary flushes a 200 shell before the page
 * runs, which would turn `notFound()` on an unknown product slug into a soft
 * 404 and a `redirect()` on a signed-out checkout into a 200.
 */
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-24" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
