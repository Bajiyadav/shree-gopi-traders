"use client";

// Loaded with `dynamic(..., { ssr: false })` in page.tsx.
// React does not serialise the `muted` attribute during SSR (known upstream
// bug), which causes browsers to treat the video as unmuted and block
// autoplay. Client-only rendering sidesteps this completely.

import { useEffect, useRef } from "react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set muted as a DOM property — the HTML attribute is not reliably
    // serialised by React, so this guarantees the browser sees it as muted.
    video.muted = true;
    video.play().catch(() => {});

    // Pause/resume as the hero scrolls in and out of view.
    // Once the video has ended, isIntersecting will be true but the video
    // will already be paused at the final frame — play() is not called again
    // because ended videos do not restart from play() without resetting
    // currentTime first, which we deliberately never do.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!video.ended) {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(video);
    return () => observer.disconnect();
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

      {/* Bottom gradient for visual blending */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/40 to-transparent z-10" />
    </div>
  );
}
