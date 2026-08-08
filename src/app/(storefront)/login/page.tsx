import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomerId } from "@/lib/auth";
import { LoginForm } from "@/components/auth/AuthForms";
import { Card } from "@/components/ui";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your business account to order salon supplies at wholesale rates.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (await getCurrentCustomerId()) redirect(searchParams.next ?? "/account");

  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Order at wholesale rates from {siteConfig.brandName}.
          </p>
        </div>

        <Card className="p-6">
          <LoginForm next={searchParams.next} />
        </Card>
      </div>
    </div>
  );
}
