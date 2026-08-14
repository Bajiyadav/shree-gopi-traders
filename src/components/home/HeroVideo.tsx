"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

const BRAND_NAME = "Sree Gopi Traders";
const BRAND_TAGLINE = "Wholesale · Cash on Delivery · Pan India";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showBrand, setShowBrand] = useState(false);

  // Force play as soon as component mounts.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  function handleEnded() {
    // Show brand card for 2 seconds, then restart.
    setShowBrand(true);
    setTimeout(() => {
      setShowBrand(false);
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = 0;
      video.play().catch(() => {});
    }, 2000);
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200 bg-slate-900"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden="true"
    >
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        className="absolute inset-0 h-full w-full object-cover"
        suppressHydrationWarning
      />

      {/* 2-second brand pause overlay at end of each loop */}
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-500"
        style={{ opacity: showBrand ? 1 : 0 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
          B2B Salon &amp; Parlour Supplies
        </p>
        <p className="text-2xl font-bold text-white sm:text-3xl">
          {BRAND_NAME}
        </p>
        <p className="text-sm text-slate-300">{BRAND_TAGLINE}</p>
      </div>

      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent z-10" />
    </div>
  );
}
