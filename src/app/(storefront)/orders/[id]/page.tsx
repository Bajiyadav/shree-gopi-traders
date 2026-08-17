import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getOrderById } from "@/actions/orders";
import { requireCustomer } from "@/lib/auth";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { Alert, ButtonLink, Card, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { WhatsAppButton } from "@/components/layout/WhatsApp";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface ShippingAddress {
  contactName?: string;
  businessName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  await requireCustomer(`/orders/${params.id}`);
  const order = await getOrderById(params.id);
  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as ShippingAddress;
  const justPlaced = searchParams.placed === "1";
  const canCancel = ["PENDING", "CONFIRMED"].includes(order.status);

  return (
    <div className="container-page py-8 sm:py-10">
      {justPlaced && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-emerald-900">
              Order placed successfully
            </h2>
            <p className="mt-1 text-sm text-emerald-800">
              Your order <strong>{order.orderNumber}</strong> has been received. Pay{" "}
              {formatCurrency(Number(order.total))} in cash when your delivery arrives. We will
              confirm dispatch shortly.
            </p>
          </div>
        </div>
      )}

      <nav className="mb-5 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-brand-700">Account</Link>
        <span aria-hidden="true">/</span>
        <Link href="/orders" className="hover:text-brand-700">Orders</Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-900">{order.orderNumber}</span>
      </nav>

      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${formatDate(order.createdAt, true)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} kind="payment" />
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-5 text-base font-semibold">Order Tracking</h2>
            <OrderTimeline
              status={order.status}
              placedAt={order.createdAt}
              updatedAt={order.updatedAt}
            />

            {order.delivery && order.status !== "CANCELLED" && (
              <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-slate-500">Delivery status</p>
                  <p className="mt-0.5 font-medium text-slate-900">
                    {humanize(order.delivery.status)}
                  </p>
                </div>
                {order.delivery.courierName && (
                  <div>
                    <p className="text-slate-500">Courier</p>
                    <p className="mt-0.5 font-medium text-slate-900">{order.delivery.courierName}</p>
                  </div>
                )}
                {order.delivery.trackingNumber && (
                  <div>
                    <p className="text-slate-500">Tracking number</p>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {order.delivery.trackingNumber}
                    </p>
                  </div>
                )}
                {order.delivery.expectedDeliveryDate && (
                  <div>
                    <p className="text-slate-500">Expected delivery</p>
                    <p className="mt-0.5 font-medium text-slate-900">
                      {formatDate(order.delivery.expectedDeliveryDate)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold">
                Items ({order.items.length})
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <Image
                      src={item.product.images[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cpath d='M160 100h80v80h-80z' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linejoin='round'/%3E%3Ccircle cx='180' cy='120' r='8' fill='%23cbd5e1'/%3E%3Cpath d='M160 170l30-30 20 20 15-15 35 35' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-700"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.variantName} · Qty {item.quantity}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatCurrency(Number(item.unitPrice))} per unit
                      {Number(item.listPrice) > Number(item.unitPrice) && (
                        <span className="ml-2 text-slate-400 line-through">
                          {formatCurrency(Number(item.listPrice))}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatCurrency(Number(item.lineTotal))}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Payment Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal</dt>
                <dd className="font-medium">{formatCurrency(Number(order.subtotal))}</dd>
              </div>
              {Number(order.bulkDiscount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Wholesale savings</dt>
                  <dd className="font-medium text-emerald-700">
                    −{formatCurrency(Number(order.bulkDiscount))}
                  </dd>
                </div>
              )}
              {Number(order.couponDiscount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Coupon ({order.couponCode})</dt>
                  <dd className="font-medium text-emerald-700">
                    −{formatCurrency(Number(order.couponDiscount))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-600">Delivery</dt>
                <dd className="font-medium">
                  {Number(order.deliveryFee) === 0 ? (
                    <span className="text-emerald-700">Free</span>
                  ) : (
                    formatCurrency(Number(order.deliveryFee))
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold">{formatCurrency(Number(order.total))}</dd>
              </div>
            </dl>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Payment method: {humanize(order.paymentMethod)}
              {order.gstNumber && <> · GST: {order.gstNumber}</>}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Delivery Address</h2>
            <address className="mt-3 text-sm not-italic leading-relaxed text-slate-700">
              {address.businessName && (
                <span className="block font-medium text-slate-900">{address.businessName}</span>
              )}
              {address.contactName && <span className="block">{address.contactName}</span>}
              <span className="block">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
              </span>
              <span className="block">
                {address.city}, {address.state} — {address.pincode}
              </span>
              {address.phone && <span className="mt-1 block">Phone: {address.phone}</span>}
            </address>
            {order.deliveryInstructions && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-medium">Instructions: </span>
                {order.deliveryInstructions}
              </p>
            )}
          </Card>

          {canCancel && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Need to change something?</h2>
              <p className="mt-1 text-xs text-slate-600">
                You can cancel while the order is still being prepared.
              </p>
              <div className="mt-3">
                <CancelOrderButton orderId={order.id} />
              </div>
            </Card>
          )}

          <Alert tone="info">
            <p className="font-medium">Questions about this order?</p>
            <p className="mt-1">Message us with your order number and we will help.</p>
            <div className="mt-3">
              <WhatsAppButton
                variant="outline"
                message={`Hello, I need help with order ${order.orderNumber}.`}
              >
                WhatsApp Support
              </WhatsAppButton>
            </div>
          </Alert>

          {["CONFIRMED","PROCESSING","PACKED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED"].includes(
            order.status
          ) && (
            <ButtonLink href={`/orders/${order.id}/invoice`} className="w-full">
              View / Download Bill
            </ButtonLink>
          )}

          <ButtonLink href="/products" variant="outline" className="w-full">
            Continue Shopping
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
