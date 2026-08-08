import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { InventoryRow } from "@/components/admin/InventoryRow";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { FilterSelect, Toolbar } from "@/components/admin/common";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/admin/StatCard";
import { formatDate, formatNumber, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory" };

const PAGE_SIZE = 25;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string; page?: string };
}) {
  const q = searchParams.q?.trim();
  const filter = searchParams.filter;
  const page = Math.max(1, Number(searchParams.page) || 1);

  // "Low" needs a column-to-column comparison, which findMany cannot express —
  // resolve the matching ids with raw SQL first.
  let lowStockIds: string[] | null = null;
  if (filter === "low") {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Inventory" WHERE stock <= "lowStockThreshold" AND stock > 0
    `;
    lowStockIds = rows.map((r) => r.id);
  }

  const where: Prisma.InventoryWhereInput = {
    ...(filter === "out" ? { stock: { lte: 0 } } : {}),
    ...(lowStockIds ? { id: { in: lowStockIds } } : {}),
    ...(q
      ? {
          productVariant: {
            OR: [
              { sku: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { product: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
  };

  const [inventory, total, counts, recentTransactions] = await Promise.all([
    prisma.inventory.findMany({
      where,
      orderBy: { stock: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        productVariant: {
          select: {
            id: true,
            name: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.inventory.count({ where }),
    prisma.$queryRaw<{ total: bigint; low: bigint; out: bigint }[]>`
      SELECT COUNT(*)::bigint AS total,
             COUNT(*) FILTER (WHERE stock <= "lowStockThreshold" AND stock > 0)::bigint AS low,
             COUNT(*) FILTER (WHERE stock <= 0)::bigint AS out
      FROM "Inventory"
    `,
    prisma.inventoryTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        admin: { select: { name: true } },
        inventory: {
          select: {
            productVariant: {
              select: { name: true, sku: true, product: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  const stats = counts[0];

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Every stock change is recorded as an inventory transaction. Stock can never go below zero."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Tracked Variants" value={formatNumber(Number(stats?.total ?? 0))} icon={Boxes} />
        <StatCard
          label="Low Stock"
          value={formatNumber(Number(stats?.low ?? 0))}
          tone={Number(stats?.low ?? 0) > 0 ? "warning" : "success"}
          href="/admin/inventory?filter=low"
        />
        <StatCard
          label="Out of Stock"
          value={formatNumber(Number(stats?.out ?? 0))}
          tone={Number(stats?.out ?? 0) > 0 ? "danger" : "success"}
          href="/admin/inventory?filter=out"
        />
      </div>

      <Toolbar
        action="/admin/inventory"
        searchValue={q}
        searchPlaceholder="Search product, variant or SKU…"
      >
        <FilterSelect
          name="filter"
          value={filter}
          options={["low", "out"]}
          placeholder="All stock levels"
          label="Filter by stock level"
        />
      </Toolbar>

      {inventory.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title="No inventory records found"
          description="Try clearing the filters."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="table-scroll">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Variant</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Threshold</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Adjust stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((inv) => (
                  <InventoryRow
                    key={inv.id}
                    row={{
                      inventoryId: inv.id,
                      productId: inv.productVariant.product.id,
                      productName: inv.productVariant.product.name,
                      variantId: inv.productVariant.id,
                      variantName: inv.productVariant.name,
                      sku: inv.productVariant.sku,
                      stock: inv.stock,
                      lowStockThreshold: inv.lowStockThreshold,
                    }}
                  />
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
        basePath="/admin/inventory"
      />

      <Card className="mt-8 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold">Recent Stock Movements</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            The last 15 inventory transactions across all products.
          </p>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Product</th>
                <th className="px-4 py-2.5 text-left font-medium">Action</th>
                <th className="px-4 py-2.5 text-right font-medium">Change</th>
                <th className="px-4 py-2.5 text-left font-medium">Reason</th>
                <th className="px-4 py-2.5 text-left font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-2.5 text-slate-500">{formatDate(tx.createdAt, true)}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {tx.inventory.productVariant.product.name}
                    <span className="text-slate-500"> ({tx.inventory.productVariant.name})</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{humanize(tx.action)}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                      tx.quantity < 0 ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{tx.reason ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500">{tx.admin?.name ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-5 py-3">
          <Link href="/admin/inventory/history" className="text-sm font-medium text-brand-700">
            View full history →
          </Link>
        </div>
      </Card>
    </>
  );
}
