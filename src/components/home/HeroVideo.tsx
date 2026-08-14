"use client";

/**
 * HeroVideo
 *
 * Renders the Cloudinary promotional video in the hero section.
 *
 * Behaviour contract (matches the product brief):
 *  - Autoplay, muted, loop, playsinline — no visible controls
 *  - Responsive: fills its container while preserving original aspect ratio
 *  - Lazy-loaded via <video preload="none"> + IntersectionObserver play/pause
 *  - Fade-in once the first frame is decoded (onLoadedData)
 *  - No download of the video asset — CDN URL is used directly
 *  - Falls back gracefully when autoplay is blocked (e.g. low-power iOS mode):
 *    the poster image stays visible instead of a broken player
 */

import { useEffect, useRef, useState } from "react";

const CLOUDINARY_VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

/**
 * Cloudinary supports on-the-fly poster generation by appending /so_0.0/
 * (first frame) to the base URL and changing the extension to .jpg.
 * This gives us a free, CDN-cached poster with no extra asset.
 */
const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // IntersectionObserver: pause when out of viewport, play when back in.
  // Also kicks off playback once the element enters the viewport for the first
  // time (the initial autoplay attribute handles the very first render, but
  // this ensures re-entry after scrolling away on mobile).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() returns a promise; swallow the AbortError that fires when
          // the element is removed from the DOM before the promise resolves.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xl ring-1 ring-slate-200"
      style={{ aspectRatio: "16 / 9" }}
      aria-hidden="true"
    >
      {/* Fade-in overlay that disappears once the video is ready */}
      <div
        className="pointer-events-none absolute inset-0 bg-slate-900 transition-opacity duration-700 ease-out z-10"
        style={{ opacity: isLoaded ? 0 : 1 }}
      />

      <video
        ref={videoRef}
        src={CLOUDINARY_VIDEO_URL}
        poster={POSTER_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
        onLoadedData={() => setIsLoaded(true)}
        suppressHydrationWarning
      />

      {/* Subtle gradient overlay at the bottom for visual integration */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent" />
    </div>
  );
}
