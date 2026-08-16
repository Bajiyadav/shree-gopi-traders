"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, Volume2, VolumeX, Sparkles, HeartHandshake, ArrowRight, CheckCircle2 } from "lucide-react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786852675/shree-gopi-traders/videos/skincare-facial-treatment-showcase.mp4";
const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786852675/shree-gopi-traders/videos/skincare-facial-treatment-showcase.jpg";

export function SkincareVideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (videoRef.current && isPlaying) {
            videoRef.current.play().catch(() => {});
          }
        } else {
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isPlaying]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  return (
    <section ref={containerRef} className="py-12 bg-slate-900 text-white relative overflow-hidden border-y border-slate-800">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Video Showcase Player */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 aspect-[16/9] group">
              <video
                ref={videoRef}
                src={VIDEO_URL}
                poster={POSTER_URL}
                muted={isMuted}
                loop
                playsInline
                autoPlay
                className="w-full h-full object-cover"
                aria-label="Professional skincare and facial treatment video"
              />

              {/* Gradient Overlay for controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Floating Media Controls */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-lg"
                  aria-label={isPlaying ? "Pause skincare video" : "Play skincare video"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-lg"
                  aria-label={isMuted ? "Unmute skincare video" : "Mute skincare video"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Top Badge */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-emerald-300">
                Professional Skin & Facial Care
              </div>
            </div>
          </div>

          {/* Right Column: Skincare Highlights & CTA */}
          <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dermatologist & Parlour Formulations</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Facial Kits, Cleansers & Spa Treatment Supplies
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Complete skincare lines for professional salons, dermatological aesthetic clinics, and beauty parlours. Sourced directly from authentic certified manufacturers.
            </p>

            {/* Benefit Checkmarks */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-200">Gold, Diamond, Pearl & Papaya Facial Kits</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-200">De-Tan packs, scrubs, toners & soothing gels</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-slate-200">Facial ozone steamers & high-frequency tools</span>
              </div>
            </div>

            {/* Approved Brands */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Skincare Brands:</div>
              <div className="flex flex-wrap gap-2">
                {["Asta Berry", "Lilium", "Aroma Magic", "Raaga Professional", "L'Oréal Paris"].map((b) => (
                  <span key={b} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/categories/skin-care"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-lg shadow-emerald-600/30"
              >
                <span>Explore Skincare Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
