import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusAction } from "@/actions/orders";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { FilterSelect, StatusSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; payment?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const status = ORDER_STATUSES.includes(searchParams.status as never)
    ? (searchParams.status as (typeof ORDER_STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  // Search spans order number, customer name/phone/email and business name.
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { businessName: { contains: q, mode: "insensitive" as const } },
            { customer: { name: { contains: q, mode: "insensitive" as const } } },
            { customer: { email: { contains: q, mode: "insensitive" as const } } },
            { customer: { phone: { contains: q } } },
            {
              customer: {
                businessProfile: { businessName: { contains: q, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            businessProfile: { select: { businessName: true } },
          },
        },
        items: { select: { id: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"} matching the current filters`}
      />

      <Toolbar
        action="/admin/orders"
        searchValue={q}
        searchPlaceholder="Search order number, customer, phone or business…"
      >
        <FilterSelect
          name="status"
          value={status}
          options={ORDER_STATUSES}
          placeholder="All statuses"
          label="Filter by status"
        />
      </Toolbar>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="No orders found"
          description="Try clearing the search or status filter."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Business / Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-left font-medium">Payment</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">
                        {order.businessName ??
                          order.customer.businessProfile?.businessName ??
                          "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.customer.name} · {order.customer.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {order.items.length}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {formatCurrency(Number(order.total), { decimals: false })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.paymentStatus} kind="payment" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        action={updateOrderStatusAction}
                        fields={{ orderId: order.id }}
                        name="status"
                        options={ORDER_STATUSES}
                        current={order.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        baseParams={searchParams as Record<string, string | undefined>}
        basePath="/admin/orders"
      />
    </>
  );
}
