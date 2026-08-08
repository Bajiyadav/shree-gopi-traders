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
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="Shop by Category"
        description="Everything a salon, parlour, spa, academy or beauty studio needs — organised by department."
      />

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
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <Image
                  src={c.imageUrl || "/images/categories/placeholder.svg"}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
                    {c.name}
                  </h2>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {c._count.products}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{c.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
