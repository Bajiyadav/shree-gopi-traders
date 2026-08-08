import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2.5", className)}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
        aria-hidden="true"
      >
        SG
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">
          {siteConfig.brandName}
        </span>
        {!compact && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Salon &amp; Parlour Supplies
          </span>
        )}
      </span>
    </Link>
  );
}
