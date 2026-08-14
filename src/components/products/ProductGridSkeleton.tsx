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
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm"
        >
          {/* Image placeholder — matches the new 4:3 ratio */}
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-4">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-3/4" />
            <Skeleton className="mt-3 h-3.5 w-20" />
            <Skeleton className="mt-1 h-3 w-16" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
