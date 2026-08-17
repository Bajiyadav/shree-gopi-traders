"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Alert, Badge, Card, Input, Select } from "@/components/ui";
import { SlotUploader } from "./SlotUploader";
import { cn } from "@/lib/utils";

/** Where an image came from. Real photography is the goal; the rest is stock-gap. */
export type Provenance = "real" | "ai" | "local" | "other" | "missing";

export interface MediaProduct {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  categoryName: string;
  isActive: boolean;
  images: string[];
}

const PROVENANCE_LABEL: Record<Provenance, string> = {
  real: "Real photo",
  ai: "AI-generated",
  local: "Local file",
  other: "Other",
  missing: "Missing",
};

const PROVENANCE_TONE: Record<Provenance, "success" | "warning" | "info" | "neutral" | "danger"> = {
  real: "success",
  ai: "warning",
  local: "info",
  other: "neutral",
  missing: "danger",
};

/** Classifies by the Cloudinary folder the upload pipeline writes into. */
export function provenanceOf(url: string | undefined): Provenance {
  if (!url) return "missing";
  if (url.includes("/products/real/")) return "real";
  if (/\/products\/v\d+\//.test(url)) return "ai";
  if (url.startsWith("/")) return "local";
  return "other";
}

/** A product is "real" only when every one of its views is real. */
function productProvenance(images: string[]): Provenance {
  const views = [0, 1, 2].map((i) => provenanceOf(images[i]));
  if (views.every((v) => v === "real")) return "real";
  if (views.some((v) => v === "missing")) return "missing";
  if (views.some((v) => v === "ai")) return "ai";
  return views[0];
}

export function MediaLibrary({ products }: { products: MediaProduct[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<"all" | Provenance>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  // Stable identity so SlotUploader's effect does not refire on every render.
  const setToast = useCallback((message: string, ok: boolean) => setFeedback({ message, ok }), []);

  const counts = useMemo(() => {
    const c = { total: 0, real: 0, ai: 0, local: 0, other: 0, missing: 0 };
    products.forEach((p) =>
      p.images.forEach((img) => {
        c.total++;
        c[provenanceOf(img)]++;
      })
    );
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (status === "active" && !p.isActive) return false;
      if (status === "inactive" && p.isActive) return false;
      if (source !== "all" && productProvenance(p.images) !== source) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle) ||
        (p.brand ?? "").toLowerCase().includes(needle) ||
        p.categoryName.toLowerCase().includes(needle)
      );
    });
  }, [products, q, source, status]);

  const shownImages = filtered.reduce((n, p) => n + p.images.length, 0);

  return (
    <div className="space-y-5">
      {feedback && (
        <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
      )}

      {/* ── Totals ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {([
          ["Total images", counts.total, "neutral"],
          ["Real photography", counts.real, "success"],
          ["AI-generated", counts.ai, "warning"],
          ["Local files", counts.local, "info"],
          ["Missing", counts.missing, "danger"],
        ] as const).map(([label, value, tone]) => (
          <Card key={label} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
            {label === "Real photography" && counts.total > 0 && (
              <Badge tone={tone} className="mt-2">
                {Math.round((counts.real / counts.total) * 100)}% of catalogue
              </Badge>
            )}
          </Card>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, SKU, brand or category…"
          className="sm:max-w-sm"
          aria-label="Search products"
        />
        <Select value={source} onChange={(e) => setSource(e.target.value as typeof source)} aria-label="Filter by image source">
          <option value="all">All sources</option>
          <option value="real">Real photography</option>
          <option value="ai">AI-generated</option>
          <option value="local">Local files</option>
          <option value="missing">Missing images</option>
          <option value="other">Other</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
          <option value="all">Active &amp; inactive</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </Select>
        <p className="text-sm text-slate-500 sm:ml-auto">
          {filtered.length} product{filtered.length === 1 ? "" : "s"} · {shownImages} image{shownImages === 1 ? "" : "s"}
        </p>
      </Card>

      {/* ── Grid ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          No products match these filters.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-sm font-semibold text-slate-900 hover:text-brand-700"
                >
                  {p.name}
                </Link>
                <span className="font-mono text-xs text-slate-500">{p.sku}</span>
                <Badge tone={PROVENANCE_TONE[productProvenance(p.images)]}>
                  {PROVENANCE_LABEL[productProvenance(p.images)]}
                </Badge>
                {!p.isActive && <Badge tone="neutral">Hidden</Badge>}
                <span className="ml-auto text-xs text-slate-500">
                  {p.brand ?? "—"} · {p.categoryName}
                </span>
              </div>

              {/* Every view, not just the first — three slots always shown so a
                  gap is as visible as a picture. */}
              <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
                {[0, 1, 2].map((slot) => {
                  const url = p.images[slot];
                  const prov = provenanceOf(url);
                  return (
                    <figure key={slot} className="space-y-1.5">
                      <div
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-lg border bg-slate-50",
                          prov === "missing" ? "border-dashed border-red-300" : "border-slate-200"
                        )}
                      >
                        {url ? (
                          <Image
                            src={url}
                            alt={`${p.name} — view ${slot + 1}`}
                            fill
                            sizes="(max-width: 640px) 30vw, 180px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-xs text-red-500">
                            No image
                          </span>
                        )}
                      </div>
                      <figcaption className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">
                            View {slot + 1}
                          </span>
                          <Badge tone={PROVENANCE_TONE[prov]} className="text-[10px]">
                            {PROVENANCE_LABEL[prov]}
                          </Badge>
                        </div>
                        <SlotUploader
                          productId={p.id}
                          slot={slot + 1}
                          hasImage={Boolean(url)}
                          onDone={setToast}
                        />
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
