import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/config";
import { AdminSettingsForms } from "@/components/admin/SettingsForms";
import { Alert, Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  const [products, categories, customers, orders, coupons] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.coupon.count(),
  ]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your admin account and the store configuration currently in effect."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <AdminSettingsForms adminName={admin.name} adminEmail={admin.email} />
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="text-base font-semibold">Store Configuration</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Set through environment variables — change them in your hosting provider, not here.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Brand name</dt>
                <dd className="font-medium text-slate-900">{siteConfig.brandName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Site URL</dt>
                <dd className="break-all font-medium text-slate-900">{siteConfig.siteUrl}</dd>
              </div>
              <div>
                <dt className="text-slate-500">WhatsApp number</dt>
                <dd className="font-medium text-slate-900">
                  {siteConfig.whatsappNumber || (
                    <span className="text-amber-700">Not configured</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Currency</dt>
                <dd className="font-medium text-slate-900">
                  {siteConfig.currency} ({siteConfig.currencySymbol})
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Payment methods</dt>
                <dd className="font-medium text-slate-900">Cash on Delivery</dd>
              </div>
              <div>
                <dt className="text-slate-500">Free delivery above</dt>
                <dd className="font-medium text-slate-900">₹5,000 (₹199 flat below)</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Store Data</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              {[
                ["Products", products],
                ["Categories", categories],
                ["Customers", customers],
                ["Orders", orders],
                ["Coupons", coupons],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold">Admin Account</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="break-all font-medium text-slate-900">{admin.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">{formatDate(admin.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Session length</dt>
                <dd className="font-medium text-slate-900">8 hours</dd>
              </div>
            </dl>
          </Card>

          <Alert tone="warning">
            <p className="font-medium">Security reminder</p>
            <p className="mt-1">
              Change the seeded admin password immediately after your first production deploy.
            </p>
          </Alert>
        </aside>
      </div>
    </>
  );
}
