import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ensureInvoice, buildInvoiceTotals, isBillable } from "@/lib/invoice";
import { getBillableOrder } from "@/lib/invoice-access";
import { siteConfig } from "@/lib/config";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";
import { PrintButton } from "@/components/orders/PrintButton";

export const metadata: Metadata = {
  title: "Invoice",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface Address {
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

export default async function InvoicePage({ params }: { params: { id: string } }) {
  // Authorization happens here, server-side. An order id in the URL proves
  // nothing — this returns null unless the caller owns the order or is an admin.
  const result = await getBillableOrder(params.id);
  if (!result) notFound();

  const { order, viewer } = result;
  if (!isBillable(order.status)) {
    return (
      <div className="container-page py-12">
        <h1 className="text-2xl font-semibold">Invoice not available</h1>
        <p className="mt-2 max-w-lg text-slate-600">
          An invoice is issued once an order is confirmed. This order is currently{" "}
          <strong>{humanize(order.status)}</strong>
          {order.status === "CANCELLED"
            ? " — a cancelled order is not billed."
            : " — please check back once it has been confirmed."}
        </p>
        <Link href={`/orders/${order.id}`} className="mt-6 inline-block text-brand-700 underline">
          Back to order
        </Link>
      </div>
    );
  }

  const invoice = await ensureInvoice(order.id);
  const totals = buildInvoiceTotals(order);
  const address = (order.shippingAddress ?? {}) as Address;
  const profile = order.customer.businessProfile;

  return (
    <div className="bg-slate-100 py-8 print:bg-white print:py-0">
      {/* Screen-only toolbar; the print stylesheet removes it. */}
      <div className="container-page mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={viewer.kind === "admin" ? `/admin/orders/${order.id}` : `/orders/${order.id}`}
          className="text-sm font-medium text-slate-700 hover:text-brand-700"
        >
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="invoice-sheet mx-auto max-w-[820px] bg-white p-10 shadow-card print:max-w-none print:p-0 print:shadow-none">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {siteConfig.brandName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">Salon &amp; Parlour Materials Supplier</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {siteConfig.siteUrl.replace(/^https?:\/\//, "")}
              {siteConfig.whatsappNumber && (
                <>
                  <br />
                  Phone / WhatsApp: +{siteConfig.whatsappNumber.replace(/\D/g, "")}
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold uppercase tracking-wide text-slate-900">Invoice</p>
            <table className="mt-2 text-xs">
              <tbody>
                <tr>
                  <td className="pr-3 text-right text-slate-500">Invoice No</td>
                  <td className="font-mono font-semibold text-slate-900">{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-right text-slate-500">Invoice Date</td>
                  <td className="text-slate-900">{formatDate(invoice.invoiceDate)}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-right text-slate-500">Order No</td>
                  <td className="font-mono text-slate-900">{order.orderNumber}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-right text-slate-500">Order Date</td>
                  <td className="text-slate-900">{formatDate(order.createdAt)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        {/* Parties */}
        <section className="grid gap-8 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill To</h2>
            <div className="mt-2 text-sm leading-relaxed text-slate-800">
              <p className="font-semibold text-slate-900">
                {order.businessName ?? profile?.businessName ?? order.customer.name}
              </p>
              <p>{address.contactName ?? order.customer.name}</p>
              <p>{order.customer.phone}</p>
              <p className="break-all">{order.customer.email}</p>
              {(order.gstNumber ?? profile?.gstNumber) && (
                <p className="mt-1 font-mono text-xs">
                  GSTIN: {order.gstNumber ?? profile?.gstNumber}
                </p>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ship To
            </h2>
            <address className="mt-2 text-sm not-italic leading-relaxed text-slate-800">
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
          </div>
        </section>

        {/* Items — every figure is the snapshot stored at checkout */}
        <section className="py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 text-left font-semibold">Product</th>
                <th className="py-2 text-left font-semibold">SKU</th>
                <th className="py-2 text-left font-semibold">Variant</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Rate</th>
                <th className="py-2 text-right font-semibold">Discount</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const perUnitSaving = item.listPrice.toNumber() - item.unitPrice.toNumber();
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="py-2.5 pr-3 align-top text-slate-900">{item.productName}</td>
                    <td className="py-2.5 pr-3 align-top font-mono text-xs text-slate-500">
                      {item.product.sku}
                    </td>
                    <td className="py-2.5 pr-3 align-top text-slate-600">{item.variantName}</td>
                    <td className="py-2.5 text-right align-top tabular-nums">{item.quantity}</td>
                    <td className="py-2.5 text-right align-top tabular-nums">
                      {formatCurrency(item.listPrice.toNumber())}
                    </td>
                    <td className="py-2.5 text-right align-top tabular-nums text-emerald-700">
                      {perUnitSaving > 0
                        ? `−${formatCurrency(perUnitSaving * item.quantity)}`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right align-top font-medium tabular-nums text-slate-900">
                      {formatCurrency(item.lineTotal.toNumber())}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="flex justify-end break-inside-avoid border-t border-slate-200 pt-4">
          <table className="w-full max-w-sm text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-slate-600">Value at list price</td>
                <td className="py-1 text-right tabular-nums text-slate-600">
                  {formatCurrency(totals.listValue)}
                </td>
              </tr>
              {totals.wholesaleSavings > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">Wholesale savings</td>
                  <td className="py-1 text-right tabular-nums text-emerald-700">
                    −{formatCurrency(totals.wholesaleSavings)}
                  </td>
                </tr>
              )}
              <tr className="border-t border-slate-200">
                <td className="py-1.5 font-medium text-slate-900">Subtotal</td>
                <td className="py-1.5 text-right font-medium tabular-nums text-slate-900">
                  {formatCurrency(totals.subtotal)}
                </td>
              </tr>
              {totals.couponDiscount > 0 && (
                <tr>
                  <td className="py-1 text-slate-600">
                    Coupon discount{order.couponCode ? ` (${order.couponCode})` : ""}
                  </td>
                  <td className="py-1 text-right tabular-nums text-emerald-700">
                    −{formatCurrency(totals.couponDiscount)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-1 text-slate-600">Delivery charges</td>
                <td className="py-1 text-right tabular-nums text-slate-900">
                  {totals.deliveryFee === 0 ? "Free" : formatCurrency(totals.deliveryFee)}
                </td>
              </tr>
              {/* Tax appears only when the order actually recorded one. */}
              {totals.hasTax && (
                <tr>
                  <td className="py-1 text-slate-600">Tax</td>
                  <td className="py-1 text-right tabular-nums text-slate-900">
                    {formatCurrency(totals.tax)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-900">
                <td className="py-2 text-base font-bold text-slate-900">Grand Total</td>
                <td className="py-2 text-right text-base font-bold tabular-nums text-slate-900">
                  {formatCurrency(totals.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="mt-8 break-inside-avoid border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-600">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p>
                <span className="font-semibold text-slate-900">Payment method:</span>{" "}
                {humanize(order.paymentMethod)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Payment status:</span>{" "}
                {humanize(order.paymentStatus)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Order status:</span>{" "}
                {humanize(order.status)}
              </p>
            </div>
            <div className="text-right">
              {!totals.hasTax && (
                <p className="text-slate-500">Tax not applicable on this order.</p>
              )}
              <p className="mt-1">This is a computer-generated invoice.</p>
            </div>
          </div>
          <p className="mt-4 text-center font-medium text-slate-700">
            Thank you for your business.
          </p>
        </footer>
      </div>
    </div>
  );
}
