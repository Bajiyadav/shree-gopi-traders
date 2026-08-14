"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Directly call play() on mount — this is what makes autoplay
    // work reliably in production. The `autoPlay` HTML attribute alone
    // is often ignored by browsers; an explicit JS call is not.
    video.play().catch(() => {
      // Autoplay was blocked (e.g. user hasn't interacted yet on mobile).
      // The poster image will remain visible — nothing to do.
    });

    // Pause/resume as the video scrolls in and out of view.
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

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden="true"
    >
      {/* Poster image — always visible behind the video while it loads.
          Uses a real <img> so it renders immediately without any JS. */}
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
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onPlaying={() => setIsPlaying(true)}
          onError={() => setHasError(true)}
          suppressHydrationWarning
        />
      )}

      {/* Bottom gradient for visual blending */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent z-10" />
    </div>
  );
}
