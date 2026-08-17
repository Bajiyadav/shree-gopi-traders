import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActiveCategories } from "@/lib/catalog";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "All Categories",
  description:
    "Browse every category of professional salon and parlour supplies — hair care, equipment, skin & facial, waxing, nails, makeup, consumables, furniture, professional equipment and hygiene.",
  alternates: { canonical: "/categories" },
};

export const revalidate = 300;

export default async function CategoriesPage() {
  const categories = await getActiveCategories();

  return (
    <>
      {/* ── Page hero ─────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
        <div className="container-page py-10 sm:py-14">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Shop by Category</h1>
          <p className="mt-2 max-w-xl text-sm text-brand-200">
            Everything a salon, parlour, spa, academy or beauty studio needs — organised by
            department. Wholesale rates. Cash on delivery.
          </p>
        </div>
      </div>

      <div className="container-page py-10 sm:py-12">
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Categories will appear here once they are added in the admin panel."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                {/* Image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                  <Image
                    src={c.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cpath d='M160 100h80v80h-80z' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linejoin='round'/%3E%3Ccircle cx='180' cy='120' r='8' fill='%23cbd5e1'/%3E%3Cpath d='M160 170l30-30 20 20 15-15 35 35' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Category name on image */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h2 className="text-lg font-bold text-white drop-shadow-sm">{c.name}</h2>
                    <p className="mt-0.5 text-xs text-white/80">
                      {c._count.products} product{c._count.products === 1 ? "" : "s"}
                    </p>
                  </div>

                  {/* Arrow on hover */}
                  <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Description below */}
                {c.description && (
                  <div className="px-4 py-3">
                    <p className="line-clamp-2 text-sm text-slate-600">{c.description}</p>
                  </div>
                )}
                {!c.description && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-medium text-slate-700 group-hover:text-brand-700 transition-colors">
                      Shop {c.name}
                    </p>
                    <span className="text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
                      View all →
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
