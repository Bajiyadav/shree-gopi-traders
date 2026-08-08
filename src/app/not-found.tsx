import Link from "next/link";
import { siteConfig } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-600">
        The page you are looking for does not exist or has been moved. It may have been a product
        that is no longer stocked.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          Back to Home
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Browse Products
        </Link>
      </div>
      <p className="mt-10 text-xs text-slate-400">{siteConfig.brandName}</p>
    </div>
  );
}
