"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import { couponSchema, fieldErrors } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";
import type { ActionState } from "./types";

function optionalNumber(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null || String(raw).trim() === "") return null;
  return Number(raw);
}

export async function saveCouponAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");

    const parsed = couponSchema.safeParse({
      ...Object.fromEntries(formData),
      minOrderValue: optionalNumber(formData, "minOrderValue"),
      maxDiscount: optionalNumber(formData, "maxDiscount"),
      usageLimit: optionalNumber(formData, "usageLimit"),
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    });
    if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };
    const data = parsed.data;

    const clash = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (clash && clash.id !== id) {
      return { ok: false, fieldErrors: { code: "A coupon with this code already exists" } };
    }

    const payload = {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderValue: data.minOrderValue ?? null,
      maxDiscount: data.maxDiscount ?? null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      usageLimit: data.usageLimit ?? null,
      isActive: data.isActive,
    };

    if (id) {
      await prisma.coupon.update({ where: { id }, data: payload });
    } else {
      await prisma.coupon.create({ data: payload });
    }

    revalidatePath("/admin/coupons");
    return { ok: true, message: id ? "Coupon updated" : "Coupon created" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function toggleCouponAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    const id = String(formData.get("id") ?? "");
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return { ok: false, error: "Coupon not found" };
    await prisma.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
    revalidatePath("/admin/coupons");
    return { ok: true, message: coupon.isActive ? "Coupon deactivated" : "Coupon activated" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteCouponAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdminAction();
    await prisma.coupon.delete({ where: { id: String(formData.get("id") ?? "") } });
    revalidatePath("/admin/coupons");
    return { ok: true, message: "Coupon deleted" };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
