import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Track your salon supply orders and delivery status.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const customer = await requireCustomer("/orders");

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { items: true, delivery: true },
  });

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="My Orders"
        description={`${orders.length} order${orders.length === 1 ? "" : "s"} placed`}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="You have not placed any orders yet"
          description="Once you place an order it will appear here with live delivery status."
          action={<ButtonLink href="/products">Shop Products</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <div>
                    <span className="text-slate-500">Order </span>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {order.orderNumber}
                    </Link>
                  </div>
                  <span className="text-slate-500">{formatDate(order.createdAt)}</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(Number(order.total))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  <StatusBadge status={order.paymentStatus} kind="payment" />
                </div>
              </div>

              <div className="px-5 py-4">
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {order.items.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex justify-between gap-4">
                      <span className="truncate">
                        {item.productName}{" "}
                        <span className="text-slate-500">({item.variantName})</span> ×{" "}
                        {item.quantity}
                      </span>
                      <span className="shrink-0 text-slate-600">
                        {formatCurrency(Number(item.lineTotal))}
                      </span>
                    </li>
                  ))}
                  {order.items.length > 3 && (
                    <li className="text-xs text-slate-500">
                      + {order.items.length - 3} more item{order.items.length - 3 === 1 ? "" : "s"}
                    </li>
                  )}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {order.delivery?.trackingNumber ? (
                    <p className="text-xs text-slate-500">
                      {order.delivery.courierName} · Tracking {order.delivery.trackingNumber}
                    </p>
                  ) : (
                    <span />
                  )}
                  <ButtonLink href={`/orders/${order.id}`} variant="outline" size="sm">
                    View Details &amp; Track
                  </ButtonLink>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
