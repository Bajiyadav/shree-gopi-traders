import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusAction } from "@/actions/orders";
import { updateDeliveryAction } from "@/actions/delivery";
import { ButtonLink, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status";
import { ManagedForm, StatusSelect } from "@/components/admin/common";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Order Details" };

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

const DELIVERY_STATUSES = [
  "PENDING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
] as const;

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

function toDateInput(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: { include: { businessProfile: true } },
      items: { include: { product: { select: { slug: true } } } },
      delivery: true,
    },
  });
  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as ShippingAddress;

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/orders" className="hover:text-brand-700">
          ← Back to orders
        </Link>
      </nav>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDate(order.createdAt, true)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} kind="payment" />
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold">Items ({order.items.length})</h2>
            </div>
            <div className="table-scroll">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Product</th>
                    <th className="px-5 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-5 py-2.5 text-right font-medium">List price</th>
                    <th className="px-5 py-2.5 text-right font-medium">Charged</th>
                    <th className="px-5 py-2.5 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="font-medium text-slate-900 hover:text-brand-700"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-xs text-slate-500">{item.variantName}</p>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                        {formatCurrency(Number(item.listPrice))}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(Number(item.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-5 text-base font-semibold">Order Tracking</h2>
            <OrderTimeline
              status={order.status}
              placedAt={order.createdAt}
              updatedAt={order.updatedAt}
            />
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Delivery Management</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Updating delivery also advances the order status to match.
            </p>

            <ManagedForm action={updateDeliveryAction} className="mt-5">
              {({ error }) => (
                <>
                  <input type="hidden" name="orderId" value={order.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Delivery Status" htmlFor="status" error={error("status")} required>
                      <Select
                        id="status"
                        name="status"
                        defaultValue={order.delivery?.status ?? "PENDING"}
                      >
                        {DELIVERY_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {humanize(s)}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Courier" htmlFor="courierName" error={error("courierName")}>
                      <Input
                        id="courierName"
                        name="courierName"
                        defaultValue={order.delivery?.courierName ?? ""}
                        placeholder="Delhivery, BlueDart…"
                      />
                    </Field>

                    <Field
                      label="Tracking Number"
                      htmlFor="trackingNumber"
                      error={error("trackingNumber")}
                    >
                      <Input
                        id="trackingNumber"
                        name="trackingNumber"
                        defaultValue={order.delivery?.trackingNumber ?? ""}
                      />
                    </Field>

                    <Field
                      label="Expected Delivery"
                      htmlFor="expectedDeliveryDate"
                      error={error("expectedDeliveryDate")}
                    >
                      <Input
                        id="expectedDeliveryDate"
                        name="expectedDeliveryDate"
                        type="date"
                        defaultValue={toDateInput(order.delivery?.expectedDeliveryDate)}
                      />
                    </Field>

                    <Field
                      label="Delivery Notes"
                      htmlFor="deliveryNotes"
                      error={error("deliveryNotes")}
                      className="sm:col-span-2"
                    >
                      <Textarea
                        id="deliveryNotes"
                        name="deliveryNotes"
                        rows={2}
                        defaultValue={order.delivery?.deliveryNotes ?? ""}
                      />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <SubmitButton pendingText="Saving…">Update Delivery</SubmitButton>
                  </div>
                </>
              )}
            </ManagedForm>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Billing</h2>
            {["CONFIRMED","PROCESSING","PACKED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED"].includes(
              order.status
            ) ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  The bill is generated from the order snapshot and cannot be edited.
                </p>
                <ButtonLink href={`/orders/${order.id}/invoice`} className="mt-3 w-full">
                  Generate / View Bill
                </ButtonLink>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                {order.status === "CANCELLED"
                  ? "Cancelled orders are not billed."
                  : "A bill can be issued once this order is confirmed."}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Change Order Status</h2>
            <div className="mt-3">
              <StatusSelect
                action={updateOrderStatusAction}
                fields={{ orderId: order.id }}
                name="status"
                options={ORDER_STATUSES}
                current={order.status}
                label="Order status"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Cancelling returns every item to stock and records a RETURN inventory transaction.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Payment Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Subtotal</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(Number(order.subtotal))}</dd>
              </div>
              {Number(order.bulkDiscount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Wholesale savings</dt>
                  <dd className="font-medium tabular-nums text-emerald-700">
                    −{formatCurrency(Number(order.bulkDiscount))}
                  </dd>
                </div>
              )}
              {Number(order.couponDiscount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600">Coupon ({order.couponCode})</dt>
                  <dd className="font-medium tabular-nums text-emerald-700">
                    −{formatCurrency(Number(order.couponDiscount))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-600">Delivery</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(Number(order.deliveryFee))}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold tabular-nums">{formatCurrency(Number(order.total))}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              {humanize(order.paymentMethod)}
              {order.gstNumber && ` · GST ${order.gstNumber}`}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Customer</h2>
            <div className="mt-3 space-y-1 text-sm">
              <Link
                href={`/admin/customers/${order.customerId}`}
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                {order.customer.businessProfile?.businessName ?? order.customer.name}
              </Link>
              <p className="text-slate-600">{order.customer.name}</p>
              <p className="text-slate-600">{order.customer.phone}</p>
              <p className="break-all text-slate-600">{order.customer.email}</p>
            </div>

            <h3 className="mt-5 text-sm font-semibold">Delivery Address</h3>
            <address className="mt-1.5 text-sm not-italic leading-relaxed text-slate-600">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} — {address.pincode}
              {address.phone && (
                <>
                  <br />
                  Phone: {address.phone}
                </>
              )}
            </address>

            {order.deliveryInstructions && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-medium">Instructions: </span>
                {order.deliveryInstructions}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
