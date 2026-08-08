import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { FilterSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Bulk Orders" };

const STATUSES = ["PENDING", "REVIEWING", "QUOTED", "APPROVED", "REJECTED", "COMPLETED"] as const;
const PAGE_SIZE = 20;

export default async function AdminBulkOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const status = STATUSES.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUSES)[number])
    : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.BulkOrderRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" as const } },
            { contactPerson: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { productsNote: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.bulkOrderRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.bulkOrderRequest.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        title="Bulk Order Requests"
        description={`${total} request${total === 1 ? "" : "s"}`}
      />

      <Toolbar
        action="/admin/bulk-orders"
        searchValue={q}
        searchPlaceholder="Search business, contact, email or products…"
      >
        <FilterSelect
          name="status"
          value={status}
          options={STATUSES}
          placeholder="All statuses"
          label="Filter by status"
        />
      </Toolbar>

      {requests.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="No bulk requests found"
          description="Requests raised from the storefront appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Business</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Requirement</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-right font-medium">Quote</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/bulk-orders/${req.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {req.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{req.contactPerson}</p>
                      <p className="text-xs text-slate-500">{req.phone}</p>
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <p className="line-clamp-2 text-slate-600">{req.productsNote}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.deliveryLocation}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {req.quotedAmount
                        ? formatCurrency(Number(req.quotedAmount), { decimals: false })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} kind="bulk" />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(req.createdAt)}</td>
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
        basePath="/admin/bulk-orders"
      />
    </>
  );
}
