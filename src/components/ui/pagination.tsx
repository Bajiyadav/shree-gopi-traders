import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Link-based pagination — keeps the product list a Server Component and
 * the page state in the URL (shareable, back-button friendly).
 */
export function Pagination({
  page,
  totalPages,
  baseParams,
  basePath,
}: {
  page: number;
  totalPages: number;
  baseParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Show a compact window around the current page.
  const pages: (number | "…")[] = [];
  const push = (n: number) => !pages.includes(n) && pages.push(n);
  push(1);
  if (page - 2 > 2) pages.push("…");
  for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n++) push(n);
  if (page + 2 < totalPages - 1) pages.push("…");
  if (totalPages > 1) push(totalPages);

  const itemClass = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm";

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={cn(
          itemClass,
          "border border-slate-300",
          page === 1 ? "pointer-events-none text-slate-300" : "text-slate-700 hover:bg-slate-50"
        )}
      >
        Previous
      </Link>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className={cn(itemClass, "text-slate-400")}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              itemClass,
              p === page
                ? "bg-brand-700 font-medium text-white"
                : "border border-slate-300 text-slate-700 hover:bg-slate-50"
            )}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={href(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={cn(
          itemClass,
          "border border-slate-300",
          page === totalPages
            ? "pointer-events-none text-slate-300"
            : "text-slate-700 hover:bg-slate-50"
        )}
      >
        Next
      </Link>
    </nav>
  );
}
