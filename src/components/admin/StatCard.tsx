import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "brand" | "success" | "warning" | "danger";

const TONES: Record<Tone, { ring: string; icon: string }> = {
  default: { ring: "border-slate-200", icon: "bg-slate-100 text-slate-600" },
  brand: { ring: "border-brand-200", icon: "bg-brand-50 text-brand-700" },
  success: { ring: "border-emerald-200", icon: "bg-emerald-50 text-emerald-700" },
  warning: { ring: "border-amber-200", icon: "bg-amber-50 text-amber-700" },
  danger: { ring: "border-red-200", icon: "bg-red-50 text-red-700" },
};

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "h-full rounded-xl border bg-white p-4 shadow-card transition-shadow",
        TONES[tone].ring,
        href && "hover:shadow-card-hover"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-semibold text-slate-900">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
        </div>
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES[tone].icon)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
