"use client";

/**
 * HeroVideo
 *
 * Renders the Cloudinary promotional video in the hero section.
 *
 * Behaviour contract:
 *  - Autoplay, muted, loop, playsinline — no visible controls
 *  - Responsive: fills its container while preserving original aspect ratio
 *  - preload="metadata" — fetches just enough for autoplay to work reliably
 *  - Poster image is shown as background while video loads (never a black box)
 *  - Fade-in once the first frame is ready (onCanPlay / onLoadedData)
 *  - Falls back gracefully when autoplay is blocked: poster stays visible
 */

import { useEffect, useRef, useState } from "react";

const CLOUDINARY_VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // IntersectionObserver: pause when scrolled out, play when back in.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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

  const handleReady = () => setIsLoaded(true);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden="true"
    >
      {/* Poster image shown while video is loading — never a black box */}
      <div
        className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-700 ease-out"
        style={{
          opacity: isLoaded ? 0 : 1,
          backgroundImage: `url(${POSTER_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {!hasError && (
        <video
          ref={videoRef}
          src={CLOUDINARY_VIDEO_URL}
          poster={POSTER_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          onCanPlay={handleReady}
          onLoadedData={handleReady}
          onError={() => setHasError(true)}
          suppressHydrationWarning
        />
      )}

      {/* Subtle gradient at the bottom for visual blending */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent z-20" />
    </div>
  );
}
