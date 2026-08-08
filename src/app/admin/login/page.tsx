import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentAdminId } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getCurrentAdminId()) redirect("/admin/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-white">{siteConfig.brandName}</h1>
          <p className="mt-1 text-sm text-slate-400">Admin panel sign in</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-xl">
          <AdminLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorised personnel only. All actions are recorded.
        </p>
      </div>
    </div>
  );
}
