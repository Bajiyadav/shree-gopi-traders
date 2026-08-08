import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateDeliveryAction } from "@/actions/delivery";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { FilterSelect, StatusSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Delivery" };

const DELIVERY_STATUSES = [
  "PENDING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
] as const;

const PAGE_SIZE = 20;

interface ShippingAddress {
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

export default async function AdminDeliveryPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const status = DELIVERY_STATUSES.includes(searchParams.status as never)
    ? (searchParams.status as (typeof DELIVERY_STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.DeliveryWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { trackingNumber: { contains: q, mode: "insensitive" as const } },
            { courierName: { contains: q, mode: "insensitive" as const } },
            { order: { orderNumber: { contains: q, mode: "insensitive" as const } } },
            { order: { businessName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
          },
        },
      },
    }),
    prisma.delivery.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Delivery Management"
        description="Courier, tracking and delivery status for every order. Updating a delivery keeps the order status in step."
      />

      <Toolbar
        action="/admin/delivery"
        searchValue={q}
        searchPlaceholder="Search order number, courier, tracking or business…"
      >
        <FilterSelect
          name="status"
          value={status}
          options={DELIVERY_STATUSES}
          placeholder="All delivery statuses"
          label="Filter by delivery status"
        />
      </Toolbar>

      {deliveries.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-8 w-8" />}
          title="No deliveries found"
          description="Try clearing the filters."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[68rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Destination</th>
                  <th className="px-4 py-3 text-left font-medium">Courier / Tracking</th>
                  <th className="px-4 py-3 text-left font-medium">Expected</th>
                  <th className="px-4 py-3 text-right font-medium">COD Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((delivery) => {
                  const address = (delivery.order.shippingAddress ?? {}) as ShippingAddress;
                  return (
                    <tr key={delivery.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${delivery.orderId}`}
                          className="font-medium text-slate-900 hover:text-brand-700"
                        >
                          {delivery.order.orderNumber}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {formatDate(delivery.order.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">
                          {delivery.order.businessName ?? delivery.order.customer.name}
                        </p>
                        <p className="text-xs text-slate-500">{delivery.order.customer.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {address.city}, {address.state}
                        <br />
                        <span className="text-xs text-slate-500">{address.pincode}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {delivery.courierName ?? "—"}
                        {delivery.trackingNumber && (
                          <>
                            <br />
                            <span className="font-mono text-xs text-slate-500">
                              {delivery.trackingNumber}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {delivery.expectedDeliveryDate
                          ? formatDate(delivery.expectedDeliveryDate)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                        {delivery.order.paymentStatus === "PAID"
                          ? "Collected"
                          : formatCurrency(Number(delivery.order.total), { decimals: false })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={delivery.status} kind="delivery" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect
                          action={updateDeliveryAction}
                          fields={{
                            orderId: delivery.orderId,
                            courierName: delivery.courierName ?? "",
                            trackingNumber: delivery.trackingNumber ?? "",
                          }}
                          name="status"
                          options={DELIVERY_STATUSES}
                          current={delivery.status}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        baseParams={searchParams as Record<string, string | undefined>}
        basePath="/admin/delivery"
      />
    </>
  );
}
