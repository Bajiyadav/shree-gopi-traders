"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomerId, requireAdminAction } from "@/lib/auth";
import { fieldErrors, reviewSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

/**
 * Recomputes a product's rating from its APPROVED reviews only, so a
 * pending or rejected review never moves the public score.
 */
async function recalculateProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2)),
      ratingCount: agg._count._all,
    },
  });
}

/** Customer: leave a review for a product they have actually received. */
export async function submitReviewAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const customerId = await getCurrentCustomerId();
    if (!customerId) return { ok: false, error: "Please sign in to write a review" };

    const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const { productId, rating, comment } = parsed.data;

    const hasPurchased = await prisma.orderItem.count({
      where: { productId, order: { customerId, status: "DELIVERED" } },
    });
    if (hasPurchased === 0) {
      return { ok: false, error: "You can review a product once your order has been delivered." };
    }

    const existing = await prisma.review.findFirst({ where: { productId, customerId } });
    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: { rating, comment: comment || null, status: "PENDING" },
      });
    } else {
      await prisma.review.create({
        data: { productId, customerId, rating, comment: comment || null, status: "PENDING" },
      });
    }

    revalidatePath("/admin/reviews");
    return { ok: true, message: "Thank you — your review will appear once it is approved." };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Admin: approve / reject a review, then refresh the product's rating. */
export async function moderateReviewAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return { ok: false, error: "Invalid status" };
    }

    const review = await prisma.review.update({
      where: { id },
      data: { status: status as "APPROVED" | "REJECTED" | "PENDING" },
      include: { product: { select: { id: true, slug: true } } },
    });
    await recalculateProductRating(review.product.id);

    revalidatePath("/admin/reviews");
    revalidatePath(`/products/${review.product.slug}`);
    return { ok: true, message: `Review ${status.toLowerCase()}` };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteReviewAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const review = await prisma.review.delete({
      where: { id },
      include: { product: { select: { id: true, slug: true } } },
    });
    await recalculateProductRating(review.product.id);

    revalidatePath("/admin/reviews");
    revalidatePath(`/products/${review.product.slug}`);
    return { ok: true, message: "Review deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
