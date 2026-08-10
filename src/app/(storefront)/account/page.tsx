import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Package } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoutCustomerAction } from "@/actions/auth";
import { AddressBook, ProfileForm } from "@/components/account/AccountForms";
import { Button, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/ui/status";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your business profile, addresses and orders.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await requireCustomer("/account");

  const [addresses, orders, spendAgg] = await Promise.all([
    prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { select: { id: true } } },
    }),
    // Cancelled orders are not money spent.
    prisma.order.aggregate({
      where: { customerId: customer.id, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const totalSpent = spendAgg._sum.total ?? new Prisma.Decimal(0);

  return (
    <div className="container-page py-8 sm:py-10">
      <PageHeader
        title="My Account"
        description={customer.businessProfile?.businessName ?? customer.name}
        action={
          <form action={logoutCustomerAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Orders", value: String(spendAgg._count._all) },
          { label: "Total Spent", value: formatCurrency(totalSpent.toNumber(), { decimals: false }) },
          {
            label: "Business Type",
            value: humanize(customer.businessProfile?.businessType ?? "OTHER"),
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
            <p className="mt-1.5 text-xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Business Profile</h2>
            <Card className="p-5">
              <ProfileForm
                defaults={{
                  name: customer.name,
                  email: customer.email,
                  businessName: customer.businessProfile?.businessName ?? "",
                  businessType: customer.businessProfile?.businessType ?? "OTHER",
                }}
              />
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Delivery Addresses</h2>
            <AddressBook
              addresses={addresses.map((a) => ({
                id: a.id,
                label: a.label,
                line1: a.line1,
                line2: a.line2,
                city: a.city,
                state: a.state,
                pincode: a.pincode,
                isDefault: a.isDefault,
              }))}
            />
          </section>
        </div>

        <aside>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent Orders</h2>
              <Link href="/orders" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<Package className="h-7 w-7" />}
                  title="No orders yet"
                  description="Your orders will appear here."
                  action={<ButtonLink href="/products" size="sm">Start Shopping</ButtonLink>}
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {orders.map((order) => (
                  <li key={order.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/orders/${order.id}`} className="block group">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 group-hover:text-brand-700">
                            {order.orderNumber}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatDate(order.createdAt)} · {order.items.length} item
                            {order.items.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(Number(order.total), { decimals: false })}
                          </p>
                          <div className="mt-1">
                            <StatusBadge status={order.status} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
