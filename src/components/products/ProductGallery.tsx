"use client";

import Image from "next/image";
import { useState } from "react";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "/images/categories/placeholder.svg";

/**
 * Main image + thumbnail strip + lightbox zoom.
 * Clicking the main image opens a full-screen lightbox.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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

  const prev = () => setActive((i) => (i - 1 + gallery.length) % gallery.length);
  const next = () => setActive((i) => (i + 1) % gallery.length);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        {/* Main image */}
        <div className="group relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <Image
            key={displaySrc}
            src={displaySrc}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
            onError={() => handleImageError(currentImage)}
            onClick={() => setLightboxOpen(true)}
          />

          {/* Zoom hint */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white"
            aria-label="Zoom image"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Prev/next arrows when multiple images */}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-12 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {gallery.slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === activeIndex ? "w-4 bg-brand-600" : "w-1.5 bg-white/70 hover:bg-white"
                  )}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {gallery.length > 1 && (
          <div
            className="flex gap-2 overflow-x-auto sm:w-20 sm:shrink-0 sm:flex-col sm:overflow-visible"
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
                    "relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition-all",
                    index === activeIndex
                      ? "border-brand-600 shadow-md ring-2 ring-brand-500/20"
                      : "border-slate-200 hover:border-slate-400 hover:shadow-sm"
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

      {/* ── Lightbox ─────────────────────────────────────── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
              <Image
                src={displaySrc}
                alt={alt}
                fill
                sizes="90vw"
                className="object-contain"
                priority
              />
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Prev/next in lightbox */}
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image counter */}
            <p className="mt-3 text-center text-sm text-white/70">
              {activeIndex + 1} / {gallery.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
