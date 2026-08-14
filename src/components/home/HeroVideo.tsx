"use client";

import { useEffect, useRef } from "react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;

    // Force muted via JS property (more reliable than the HTML attribute
    // on hydrated components) and kick off playback immediately.
    video.muted = true;
    video.play().catch(() => {});

    function handleEnded() {
      // Show the brand overlay.
      overlay!.style.opacity = "1";

      // After 5 seconds hide it and restart.
      setTimeout(() => {
        overlay!.style.opacity = "0";
        video!.currentTime = 0;
        video!.play().catch(() => {});
      }, 5000);
    }

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200 bg-slate-900"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Brand overlay — shown for 5 s at the end of each play-through.
          Opacity is driven directly via the ref, no React re-render needed. */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-sm"
        style={{ opacity: 0, transition: "opacity 0.5s ease" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
          B2B Salon &amp; Parlour Supplies
        </p>
        <p className="text-2xl font-bold text-white sm:text-3xl">
          Sree Gopi Traders
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
