import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteReviewAction, moderateReviewAction } from "@/actions/reviews";
import { Card, EmptyState, PageHeader, Rating } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { ActionButton, FilterSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const PAGE_SIZE = 20;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const status = STATUSES.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.ReviewWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { comment: { contains: q, mode: "insensitive" as const } },
            { product: { name: { contains: q, mode: "insensitive" as const } } },
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [reviews, total, pendingCount] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: { select: { id: true, name: true, slug: true } },
        customer: {
          select: { name: true, businessProfile: { select: { businessName: true } } },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Reviews"
        description={`${total} review${total === 1 ? "" : "s"} · ${pendingCount} awaiting moderation. Only approved reviews appear on the storefront and count toward a product's rating.`}
      />

      <Toolbar
        action="/admin/reviews"
        searchValue={q}
        searchPlaceholder="Search comment, product or customer…"
      >
        <FilterSelect
          name="status"
          value={status}
          options={STATUSES}
          placeholder="All statuses"
          label="Filter by status"
        />
      </Toolbar>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-8 w-8" />}
          title="No reviews found"
          description="Customers can review a product once their order is delivered."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Rating value={review.rating} />
                    <StatusBadge status={review.status} kind="review" />
                    <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    on{" "}
                    <Link
                      href={`/admin/products/${review.product.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {review.product.name}
                    </Link>{" "}
                    by{" "}
                    <span className="font-medium text-slate-900">
                      {review.customer.businessProfile?.businessName ?? review.customer.name}
                    </span>
                  </p>

                  {review.comment && (
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      “{review.comment}”
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  {review.status !== "APPROVED" && (
                    <ActionButton
                      action={moderateReviewAction}
                      fields={{ id: review.id, status: "APPROVED" }}
                      variant="primary"
                    >
                      Approve
                    </ActionButton>
                  )}
                  {review.status !== "REJECTED" && (
                    <ActionButton
                      action={moderateReviewAction}
                      fields={{ id: review.id, status: "REJECTED" }}
                      variant="outline"
                    >
                      Reject
                    </ActionButton>
                  )}
                  <ActionButton
                    action={deleteReviewAction}
                    fields={{ id: review.id }}
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    confirm="Delete this review permanently?"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        baseParams={searchParams as Record<string, string | undefined>}
        basePath="/admin/reviews"
      />
    </>
  );
}
