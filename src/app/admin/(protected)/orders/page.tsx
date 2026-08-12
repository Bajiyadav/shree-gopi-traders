import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusAction } from "@/actions/orders";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { FilterSelect, StatusSelect, Toolbar } from "@/components/admin/common";
import {
  DATE_RANGES,
  ORDER_STATUSES as STATUS_OPTIONS,
  PAYMENT_STATUSES,
  buildOrderWhere,
  parseOrderFilters,
} from "@/lib/order-filters";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; payment?: string; page?: string };
}) {
  const filters = parseOrderFilters(searchParams);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = buildOrderWhere(filters);

  // The export link carries the same query string, so "Export" always means
  // "export exactly what I am looking at".
  const exportQuery = new URLSearchParams(
    Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as [string, string][]
  ).toString();

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
            email: true,
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
        action={
          <ButtonLink
            href={`/admin/orders/export${exportQuery ? `?${exportQuery}` : ""}`}
            variant="outline"
            prefetch={false}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </ButtonLink>
        }
      />

      <Toolbar
        action="/admin/orders"
        searchValue={filters.q}
        searchPlaceholder="Search order number, customer, phone, business or SKU…"
      >
        <FilterSelect
          name="status"
          value={filters.status}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          label="Filter by status"
        />
        <FilterSelect
          name="payment"
          value={filters.payment}
          options={PAYMENT_STATUSES}
          placeholder="All payments"
          label="Filter by payment status"
        />
        <select
          name="range"
          defaultValue={filters.range ?? ""}
          className="input-base w-auto min-w-40"
          aria-label="Filter by date range"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
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
                      <p className="font-semibold text-slate-900">
                        {order.businessName ??
                          order.customer.businessProfile?.businessName ??
                          order.customer.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-700 font-medium">
                        {order.customer.name}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-brand-700">
                        📱 {order.customer.phone || "No phone"}
                      </p>
                      <p className="break-all text-xs font-medium text-slate-600">
                        ✉️ {order.customer.email}
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
                        options={STATUS_OPTIONS}
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
