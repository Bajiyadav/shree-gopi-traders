import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Users, Phone, Mail } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 25;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.CustomerWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
          { businessProfile: { businessName: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        businessProfile: true,
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { total: true, createdAt: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} registered business${total === 1 ? "" : "es"}`}
      />

      <Toolbar
        action="/admin/customers"
        searchValue={q}
        searchPlaceholder="Search name, business, email or phone…"
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No customers found"
          description="Try a different search term."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Business</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Total Spent</th>
                  <th className="px-4 py-3 text-left font-medium">Last Order</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => {
                  const spent = customer.orders.reduce((sum, o) => sum + Number(o.total), 0);
                  const lastOrder = customer.orders.reduce<Date | null>(
                    (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
                    null
                  );
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-slate-900 hover:text-brand-700"
                        >
                          {customer.businessProfile?.businessName ?? "—"}
                        </Link>
                        {customer.businessProfile?.gstNumber && (
                          <p className="font-mono text-xs text-slate-500">
                            GST {customer.businessProfile.gstNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                          <span>{customer.phone || "No phone"}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 break-all text-xs font-medium text-slate-700">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>{customer.email}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {humanize(customer.businessProfile?.businessType ?? "OTHER")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {customer.orders.length}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                        {formatCurrency(spent, { decimals: false })}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {lastOrder ? formatDate(lastOrder) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(customer.createdAt)}</td>
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
        basePath="/admin/customers"
      />
    </>
  );
}
