"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Card, Rating } from "@/components/ui";

export interface TabReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
}

/**
 * Tabbed product detail. A tab is only rendered when it has real content —
 * an empty "Ingredients" tab would imply we hold information we do not.
 */
export function ProductTabs({
  description,
  specs,
  ingredients,
  usageInstructions,
  reviews,
  ratingAvg,
  ratingCount,
}: {
  description: string | null;
  specs: Record<string, string>;
  ingredients: string | null;
  usageInstructions: string | null;
  reviews: TabReview[];
  ratingAvg: number;
  ratingCount: number;
}) {
  const tabs = [
    description && { id: "description", label: "Description" },
    Object.keys(specs).length > 0 && { id: "specs", label: "Specifications" },
    ingredients && { id: "ingredients", label: "Ingredients" },
    usageInstructions && { id: "usage", label: "How to Use" },
    { id: "reviews", label: `Reviews (${ratingCount})` },
  ].filter(Boolean) as { id: string; label: string }[];

  const [active, setActive] = useState(tabs[0]?.id ?? "reviews");

  return (
    <div>
      <div className="border-b border-slate-200">
        <div
          className="-mb-px flex gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Product information"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                active === tab.id
                  ? "border-brand-700 text-brand-800"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="py-6" role="tabpanel">
        {active === "description" && (
          <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {description}
          </p>
        )}

        {active === "specs" && (
          <div className="table-scroll">
            <table className="w-full max-w-2xl text-sm">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(specs).map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row" className="py-2.5 pr-6 text-left font-medium text-slate-500">
                      {key}
                    </th>
                    <td className="py-2.5 text-slate-900">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {active === "ingredients" && (
          <div className="max-w-3xl">
            <p className="text-sm leading-relaxed text-slate-700">{ingredients}</p>
            <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
              The pack carries the authoritative ingredient declaration. If you need a full
              specification sheet before ordering in bulk, ask us and we will send it.
            </p>
          </div>
        )}

        {active === "usage" && (
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700">{usageInstructions}</p>
        )}

        {active === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-600">
                No approved reviews yet. Businesses can review a product once their order has been
                delivered.
              </p>
            ) : (
              <>
                <div className="mb-5 flex items-center gap-3">
                  <Rating value={ratingAvg} size="md" />
                  <span className="text-sm text-slate-600">
                    {ratingAvg.toFixed(1)} out of 5 · {ratingCount} review
                    {ratingCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {reviews.map((review) => (
                    <Card key={review.id} className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <Rating value={review.rating} />
                        <span className="text-xs text-slate-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-700">
                          {review.comment}
                        </p>
                      )}
                      <p className="mt-3 text-xs font-medium text-slate-900">{review.author}</p>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
