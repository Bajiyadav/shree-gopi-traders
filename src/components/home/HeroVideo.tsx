"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Guaranteed muted property setting before any play attempt
    video.muted = true;
    video.playsInline = true;
    video.loop = false;

    const onEnded = () => {
      setHasEnded(true);
      video.pause();
    };

    video.addEventListener("ended", onEnded);

    // Intersection observer: only play/pause if it has not finished yet
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!video.ended && !hasEnded) {
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

    // Initial play attempt on mount
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("ended", onEnded);
      observer.disconnect();
    };
  }, [hasEnded]);

  return (
    <div
      className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-slate-900 pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
        muted
        playsInline
        autoPlay
        preload="auto"
        className="h-full w-full object-cover opacity-40 filter brightness-95"
      />
      {/* High-legibility gradient overlay protecting all hero typography and controls */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-50/95 via-white/85 to-slate-50/75 backdrop-blur-[1px]" />
    </div>
  );
}
