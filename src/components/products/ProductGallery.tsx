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
  const gallery = images.length > 0 ? images : ["/images/categories/placeholder.svg"];
  const current = gallery[Math.min(active, gallery.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <Image
          src={current}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>

      {gallery.length > 1 && (
        <div className="mt-3 flex gap-3" role="group" aria-label="Product images">
          {gallery.slice(0, 5).map((image, index) => (
            <button
              key={image + index}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${gallery.length}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square w-20 overflow-hidden rounded-lg border-2 bg-slate-50 transition-colors",
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
