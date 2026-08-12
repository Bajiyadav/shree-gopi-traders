import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Mail, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/ui/status";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      businessProfile: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      orders: { orderBy: { createdAt: "desc" }, include: { items: { select: { id: true } } } },
      bulkOrderRequests: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!customer) notFound();

  const earning = customer.orders.filter((o) => o.status !== "CANCELLED");
  const totalSpent = earning.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrder = earning.length ? totalSpent / earning.length : 0;

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/customers" className="hover:text-brand-700">
          ← Back to customers
        </Link>
      </nav>

      <PageHeader
        title={customer.businessProfile?.businessName ?? customer.name}
        description={`${customer.name} · ${customer.phone} · ${customer.email}`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Orders" value={String(customer.orders.length)} />
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent, { decimals: false })}
          tone="brand"
          sublabel="Cancelled orders excluded"
        />
        <StatCard label="Avg Order Value" value={formatCurrency(avgOrder, { decimals: false })} />
        <StatCard label="Customer Since" value={formatDate(customer.createdAt)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold">Order History</h2>
            </div>
            {customer.orders.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No orders yet" />
              </div>
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5 text-left font-medium">Order</th>
                      <th className="px-5 py-2.5 text-left font-medium">Date</th>
                      <th className="px-5 py-2.5 text-right font-medium">Items</th>
                      <th className="px-5 py-2.5 text-right font-medium">Total</th>
                      <th className="px-5 py-2.5 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{order.items.length}</td>
                        <td className="px-5 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(Number(order.total), { decimals: false })}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {customer.bulkOrderRequests.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold">Bulk Requests</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {customer.bulkOrderRequests.map((req) => (
                  <li key={req.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/bulk-orders/${req.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-brand-700"
                      >
                        {formatDate(req.createdAt)}
                      </Link>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                        {req.productsNote}
                      </p>
                    </div>
                    <StatusBadge status={req.status} kind="bulk" />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card className="p-5 border-l-4 border-l-brand-600 bg-slate-50/50">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-brand-700" /> Customer Contact Info
            </h2>
            <dl className="mt-3.5 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-brand-700" /> Mobile Number
                </dt>
                <dd className="font-bold text-brand-800 text-base mt-0.5">{customer.phone || "No phone provided"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-brand-700" /> Email Address
                </dt>
                <dd className="font-medium text-slate-900 break-all mt-0.5">{customer.email}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Business Profile</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-slate-500">Business name</dt>
                <dd className="font-medium text-slate-900">
                  {customer.businessProfile?.businessName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Business type</dt>
                <dd className="text-slate-900">
                  {humanize(customer.businessProfile?.businessType ?? "OTHER")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">GST number</dt>
                <dd className="font-mono text-slate-900">
                  {customer.businessProfile?.gstNumber ?? "—"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Addresses ({customer.addresses.length})</h2>
            {customer.addresses.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No saved addresses.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {customer.addresses.slice(0, 5).map((address) => (
                  <li key={address.id} className="text-sm leading-relaxed text-slate-600">
                    {address.label && (
                      <span className="block font-medium text-slate-900">{address.label}</span>
                    )}
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    <br />
                    {address.city}, {address.state} — {address.pincode}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
