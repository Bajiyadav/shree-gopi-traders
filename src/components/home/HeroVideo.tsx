"use client";

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

    video.muted = true;
    video.playsInline = true;
    video.loop = false;

    const handleEnded = () => {
      video.pause();
    };

    video.addEventListener("ended", handleEnded);

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
    return () => {
      video.removeEventListener("ended", handleEnded);
      observer.disconnect();
    };
  }, []);

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
        preload="auto"
        className="h-full w-full object-cover opacity-25 filter brightness-90"
      />
      {/* High-legibility gradient overlay protecting all hero typography and controls */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-50/95 via-white/90 to-slate-50/80 backdrop-blur-[1px]" />
    </div>
  );
}

