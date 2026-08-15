"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, Volume2, VolumeX, Building2, Package, Truck, ArrowRight, CheckCircle } from "lucide-react";

const VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";
const POSTER_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/so_0.0/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.jpg";

export function CompleteSalonSupplyVideo() {
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
    <section ref={containerRef} className="py-14 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold tracking-wide uppercase">
            <Building2 className="w-3.5 h-3.5" />
            <span>Turnkey B2B Wholesale Distribution</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything Your Salon Needs From One Supplier
          </h2>

          <p className="text-slate-300 text-sm sm:text-base">
            From consumable hair & skin products to heavy salon styling chairs, trolleys, and towel warmers. Shree Gopi Traders delivers authentic wholesale inventory across India.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Key Pillars */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2.5 text-brand-400 font-semibold text-sm">
                <Package className="w-5 h-5" />
                <span>200+ Verified Active SKUs</span>
              </div>
              <p className="text-xs text-slate-300">
                Extensive catalogue spanning Hair Care, Color, Skincare, Waxing, Barber Tools, Equipment & Furniture.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
                <Truck className="w-5 h-5" />
                <span>Tiered Wholesale Pricing</span>
              </div>
              <p className="text-xs text-slate-300">
                Bulk discounts up to 35% off MRP with low minimum order quantities tailored for salon chains and independent parlours.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>100% Genuine Authenticity</span>
              </div>
              <p className="text-xs text-slate-300">
                Direct authorized sourcing with GST invoices, batch tracking, and guaranteed manufacturer freshness.
              </p>
            </div>
          </div>

          {/* Right Column: Video Showcase Player */}
          <div className="lg:col-span-8">
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
                aria-label="Complete salon supply wholesale video"
              />

              {/* Gradient Overlay for controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Floating Media Controls */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-brand-600 text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-lg"
                  aria-label={isPlaying ? "Pause salon supply video" : "Play salon supply video"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-black/70 hover:bg-brand-600 text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-lg"
                  aria-label={isMuted ? "Unmute salon supply video" : "Mute salon supply video"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Top Right Callout */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white">
                B2B Salon Supply Network
              </div>
            </div>
          </div>
        </div>

        {/* Action bar below */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-slate-300">
            Ready to upgrade your salon inventory with bulk B2B rates?
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bulk-orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition shadow-md shadow-brand-600/30"
            >
              <span>Request Wholesale Quote</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition"
            >
              <span>View All 200 Products</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
