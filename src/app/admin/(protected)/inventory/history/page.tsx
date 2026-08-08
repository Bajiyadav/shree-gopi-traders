import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { FilterSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory History" };

const PAGE_SIZE = 40;
const ACTIONS = ["RESTOCK", "ORDER", "ADJUSTMENT", "RETURN", "DAMAGE"] as const;

export default async function InventoryHistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; action?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const action = ACTIONS.includes(searchParams.action as never)
    ? (searchParams.action as (typeof ACTIONS)[number])
    : undefined;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Prisma.InventoryTransactionWhereInput = {
    ...(action ? { action } : {}),
    ...(q
      ? {
          OR: [
            { reason: { contains: q, mode: "insensitive" as const } },
            {
              inventory: {
                productVariant: {
                  OR: [
                    { sku: { contains: q, mode: "insensitive" as const } },
                    { product: { name: { contains: q, mode: "insensitive" as const } } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        admin: { select: { name: true } },
        inventory: {
          select: {
            productVariant: {
              select: { name: true, sku: true, product: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.inventoryTransaction.count({ where }),
  ]);

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/inventory" className="hover:text-brand-700">
          ← Back to inventory
        </Link>
      </nav>

      <PageHeader
        title="Inventory History"
        description={`${total} recorded stock movement${total === 1 ? "" : "s"}`}
      />

      <Toolbar
        action="/admin/inventory/history"
        searchValue={q}
        searchPlaceholder="Search product, SKU or reason…"
      >
        <FilterSelect
          name="action"
          value={action}
          options={ACTIONS}
          placeholder="All actions"
          label="Filter by action"
        />
      </Toolbar>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="No stock movements found"
          description="Try clearing the filters."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Variant</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-right font-medium">Change</th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{formatDate(tx.createdAt, true)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${tx.inventory.productVariant.product.id}`}
                        className="text-slate-900 hover:text-brand-700"
                      >
                        {tx.inventory.productVariant.product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tx.inventory.productVariant.name}
                      <span className="ml-1.5 font-mono text-xs text-slate-400">
                        {tx.inventory.productVariant.sku}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{humanize(tx.action)}</td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        tx.quantity < 0 ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{tx.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{tx.admin?.name ?? "System"}</td>
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
        basePath="/admin/inventory/history"
      />
    </>
  );
}
