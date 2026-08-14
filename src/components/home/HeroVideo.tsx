"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/config";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

/** Milliseconds to hold the brand card at the end of each loop. */
const END_PAUSE_MS = 2000;

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Explicit play() call — the autoPlay HTML attribute alone is
    // frequently ignored by browsers in production.
    video.play().catch(() => {});

    // Pause/resume as the hero scrolls in and out of view.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // When the video finishes: show the brand card for END_PAUSE_MS,
  // then restart. We handle looping ourselves instead of using the
  // `loop` attribute so we can insert the pause.
  function handleEnded() {
    setShowBrand(true);
    setTimeout(() => {
      setShowBrand(false);
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = 0;
      video.play().catch(() => {});
    }, END_PAUSE_MS);
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden="true"
    >
      {/* Poster shown while video hasn't started yet */}
      {!isPlaying && !hasError && (
        <Image
          src={POSTER_URL}
          alt=""
          fill
          className="object-cover"
          priority
          unoptimized
        />
      )}

      {!hasError && (
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onPlaying={() => setIsPlaying(true)}
          onEnded={handleEnded}
          onError={() => setHasError(true)}
          suppressHydrationWarning
        />
      )}

      {/* Brand card — fades in at the end of each loop for 2 seconds */}
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/75 backdrop-blur-sm transition-opacity duration-500"
        style={{ opacity: showBrand ? 1 : 0 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-300">
          B2B Salon &amp; Parlour Supplies
        </p>
        <p className="text-2xl font-bold text-white sm:text-3xl">
          {siteConfig.brandName}
        </p>
        <p className="text-sm text-slate-300">
          Wholesale · Cash on Delivery · Pan India
        </p>
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent z-10" />
    </div>
  );
}
