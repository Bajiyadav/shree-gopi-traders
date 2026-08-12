"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "/images/categories/placeholder.svg";

/**
 * Main image plus a clickable thumbnail strip.
 * Reactive state ensures that clicking any thumbnail immediately renders the main view.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const uniqueImages = Array.from(new Set(images.filter(Boolean)));
  const gallery = uniqueImages.length > 0 ? uniqueImages : [FALLBACK_IMAGE];
  const activeIndex = Math.min(active, gallery.length - 1);
  const currentImage = gallery[activeIndex];
  const displaySrc = failedImages.has(currentImage) ? FALLBACK_IMAGE : currentImage;

  const handleImageError = (imgUrl: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(imgUrl);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row-reverse">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <Image
          key={displaySrc}
          src={displaySrc}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
          onError={() => handleImageError(currentImage)}
        />
      </div>

      {gallery.length > 1 && (
        <div
          className="flex gap-3 overflow-x-auto sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-visible"
          role="group"
          aria-label="Product images"
        >
          {gallery.slice(0, 5).map((image, index) => {
            const thumbSrc = failedImages.has(image) ? FALLBACK_IMAGE : image;
            return (
              <button
                key={image + index}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${gallery.length}`}
                aria-current={index === activeIndex}
                className={cn(
                  "relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-slate-50 transition-colors",
                  index === activeIndex
                    ? "border-brand-700 ring-2 ring-brand-500/20"
                    : "border-slate-200 hover:border-slate-400"
                )}
              >
                <Image
                  src={thumbSrc}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  onError={() => handleImageError(image)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

