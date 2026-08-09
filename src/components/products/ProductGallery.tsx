"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Main image plus a clickable thumbnail strip. Kept client-side only for the
 * selection state — the images themselves come from the product record.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const uniqueImages = Array.from(new Set(images.filter(Boolean)));
  const gallery = uniqueImages.length > 0 ? uniqueImages : ["/images/categories/placeholder.svg"];
  const current = gallery[Math.min(active, gallery.length - 1)];

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <Image
          src={current}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-2.5 py-1 text-xs font-bold tracking-wider text-amber-400 backdrop-blur-md shadow-md border border-amber-400/40">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          SGT VERIFIED
        </div>
      </div>

      {gallery.length > 1 && (
        <div
          className="flex gap-3 overflow-x-auto sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-visible"
          role="group"
          aria-label="Product images"
        >
          {gallery.slice(0, 5).map((image, index) => (
            <button
              key={image + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${gallery.length}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-50 transition-colors",
                index === active
                  ? "border-brand-700"
                  : "border-slate-200 hover:border-slate-400"
              )}
            >
              <Image src={image} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
