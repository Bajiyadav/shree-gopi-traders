/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not advertise the framework version.
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    // Exactly one remote host: our Cloudinary delivery domain. Never "**" —
    // a wildcard turns the Image Optimizer into an open proxy that anyone can
    // point at any URL, which is the configuration named in GHSA-9g9p-9gw9-jx7f.
    // Add a second entry only for a host we actually control.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
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
