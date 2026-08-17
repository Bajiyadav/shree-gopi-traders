"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Inline SVG fallback — no hardcoded local file path
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cpath d='M160 100h80v80h-80z' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linejoin='round'/%3E%3Ccircle cx='180' cy='120' r='8' fill='%23cbd5e1'/%3E%3Cpath d='M160 170l30-30 20 20 15-15 35 35' fill='none' stroke='%23cbd5e1' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

const VIEW_LABELS = ["Front View", "3/4 Angle", "Detail / Label"];

/**
 * 3-Image Product Gallery System with touch swipe, thumbnail selector, and lightbox zoom.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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

  const prev = useCallback(
    () => setActive((i) => (i - 1 + gallery.length) % gallery.length),
    [gallery.length]
  );

  const next = useCallback(
    () => setActive((i) => (i + 1) % gallery.length),
    [gallery.length]
  );

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (diff > minSwipeDistance) {
      next();
    } else if (diff < -minSwipeDistance) {
      prev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation when lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, prev, next]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        {/* Main image */}
        <div
          className="group relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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

          {/* Current view badge */}
          {gallery.length > 1 && (
            <div className="absolute left-3 top-3 z-10 rounded-md bg-slate-900/70 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm shadow">
              {VIEW_LABELS[activeIndex] || `View ${activeIndex + 1}`}
            </div>
          )}

          {/* Zoom hint */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white"
            aria-label="Zoom image"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Prev/next arrows when multiple images */}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white sm:flex"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-white sm:flex"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dot indicators for mobile */}
          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:hidden">
              {gallery.map((_, i) => (
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

        {/* Thumbnails strip (Desktop vertical / Mobile horizontal) */}
        {gallery.length > 1 && (
          <div
            className="flex gap-2.5 overflow-x-auto pb-1 sm:w-24 sm:shrink-0 sm:flex-col sm:overflow-visible sm:pb-0"
            role="group"
            aria-label="Product image gallery"
          >
            {gallery.map((image, index) => {
              const thumbSrc = failedImages.has(image) ? FALLBACK_IMAGE : image;
              const isSelected = index === activeIndex;
              return (
                <button
                  key={image + index}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show ${VIEW_LABELS[index] || `Image ${index + 1}`} of ${gallery.length}`}
                  aria-current={isSelected}
                  className={cn(
                    "group relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-50 transition-all sm:w-full",
                    isSelected
                      ? "border-brand-600 shadow-md ring-2 ring-brand-500/20"
                      : "border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-400 hover:shadow-sm"
                  )}
                >
                  <Image
                    src={thumbSrc}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                    onError={() => handleImageError(image)}
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/70 py-0.5 text-[9px] font-medium text-white text-center">
                    {index === 0 ? "1. Front" : index === 1 ? "2. Angle" : "3. Detail"}
                  </span>
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
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/40">
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
              aria-label="Close lightbox"
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

            {/* Image counter and view label */}
            <p className="mt-3 text-center text-sm text-white/80 font-medium">
              {VIEW_LABELS[activeIndex] || `View ${activeIndex + 1}`} ({activeIndex + 1} / {gallery.length})
            </p>
          </div>
        </div>
      )}
    </>
  );
}
