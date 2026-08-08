/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    // No remote image hosts are allowed. Every image the app ships is local
    // (see public/images), so a wildcard `remotePatterns` would only widen the
    // attack surface of the Image Optimizer for no benefit.
    // To use a CDN later, add that ONE hostname here — never "**".
    remotePatterns: [],
    formats: ["image/webp"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        // Never let a proxy or browser cache an authenticated page.
        source: "/(admin|account|orders|cart|checkout)/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

module.exports = nextConfig;
