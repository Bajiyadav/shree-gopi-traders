import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CouponManager } from "@/components/admin/CouponManager";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Coupons" };

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Coupons are validated on the server at checkout — the discount a browser displays is never trusted."
      />

      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          discountType: c.discountType,
          discountValue: Number(c.discountValue),
          minOrderValue: c.minOrderValue === null ? null : Number(c.minOrderValue),
          maxDiscount: c.maxDiscount === null ? null : Number(c.maxDiscount),
          startDate: c.startDate.toISOString().slice(0, 10),
          endDate: c.endDate.toISOString().slice(0, 10),
          usageLimit: c.usageLimit,
          usageCount: c.usageCount,
          isActive: c.isActive,
        }))}
      />
    </>
  );
}
