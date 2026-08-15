"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Play, Pause, Volume2, VolumeX, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/config";

const PROMO_VIDEO_URL =
  "https://res.cloudinary.com/dg8z7pxju/video/upload/v1786658125/Create_a_premium_photorealisti_1_y9p2y9.mp4";

const PROMO_POSTER_URL = "/images/banners/spa-equipment-banner-premium.png";

const SHOWCASE_PILLARS = [
  "Hair Care & Professional Styling",
  "Skin Care & Facial Kits",
  "Liposoluble Wax & Consumables",
  "Commercial Barber & Spa Equipment",
];

export function ShowcasePromoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.playsInline = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-24">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 -z-10 h-[400px] w-[500px] rounded-full bg-amber-500/10 blur-[100px]" />

      <div className="container-page">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left / Top Narrative */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Direct B2B Wholesale Supplier</span>
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
              Everything Your Salon Needs From One Single Partner
            </h2>

            <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
              Streamline your salon, parlour, or spa inventory. Sree Gopi Traders delivers salon-grade formulations, bulk consumables, and turnkey equipment across India with transparent tier pricing.
            </p>

            <ul className="mt-6 space-y-2.5">
              {SHOWCASE_PILLARS.map((pillar) => (
                <li key={pillar} className="flex items-center gap-3 text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{pillar}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-500 hover:shadow-brand-500/25"
              >
                <span>Explore Full 130-Product Range</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/bulk-orders"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
              >
                Request Custom Bulk Quote
              </Link>
            </div>
          </div>

          {/* Right / Bottom Cinematic Video Player */}
          <div className="lg:col-span-7">
            <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={PROMO_VIDEO_URL}
                poster={PROMO_POSTER_URL}
                muted
                playsInline
                loop
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-102"
              />

              {/* Video subtle vignette overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />

              {/* Controls bar */}
              <div className="absolute bottom-4 inset-x-4 flex items-center justify-between rounded-xl bg-slate-950/70 p-2.5 backdrop-blur-md border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-900 transition-colors hover:bg-brand-50"
                    aria-label={isPlaying ? "Pause promo video" : "Play promo video"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/80 text-white transition-colors hover:bg-slate-700"
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>

                <span className="text-xs font-medium text-slate-300">
                  {siteConfig.brandName} • Official Supplier Showcase
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
