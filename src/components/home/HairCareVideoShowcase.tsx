"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, Volume2, VolumeX, Sparkles, Scissors, ArrowRight, ShieldCheck } from "lucide-react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786852673/shree-gopi-traders/videos/professional-hair-care-showcase.mp4";
const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786852673/shree-gopi-traders/videos/professional-hair-care-showcase.jpg";

export function HairCareVideoShowcase() {
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
    <section ref={containerRef} className="py-12 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Hair Care Text & Highlights */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Professional Hair Care & Spa</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Salon-Grade Shampoos, Masques & Keratin Treatments
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Equip your salon with 100% genuine wholesale hair-care formulations from industry leaders. From deep-conditioning spa therapies to precision color protection and smoothing serums.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <Scissors className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">Shampoos & Conditioners</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">Keratin & Hair Spa Masques</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">Shine & Repair Serums</span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
                <span className="text-xs font-medium text-slate-200">Developers & Bleach</span>
              </div>
            </div>

            {/* Brand Tags */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Approved Brands Available:</div>
              <div className="flex flex-wrap gap-2">
                {["L'Oréal", "Matrix", "Biolage", "Streax", "Schwarzkopf", "Wella"].map((b) => (
                  <span key={b} className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/categories/hair-care"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition shadow-lg shadow-brand-600/30"
              >
                <span>Browse All Hair Care</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Video Player Showcase */}
          <div className="lg:col-span-7">
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
                aria-label="Professional hair care showcase video"
              />

              {/* Gradient Overlay for controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Floating Media Controls */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-brand-600 text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-lg"
                  aria-label={isPlaying ? "Pause hair care video" : "Play hair care video"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-brand-600 text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-lg"
                  aria-label={isMuted ? "Unmute hair care video" : "Mute hair care video"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Subtle Badge */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-brand-300">
                HD Salon Hair Showcase
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
