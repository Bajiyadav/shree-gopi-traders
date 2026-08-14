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
          {
            // Content-Security-Policy. The site had every other hardening
            // header but this one, which is the one that limits the damage of
            // an injected script.
            //
            // 'unsafe-inline' is required for scripts: Next.js inlines its
            // hydration bootstrap, and a nonce cannot be applied to statically
            // generated pages, which most of this catalogue is. The remaining
            // directives still remove the paths that make XSS useful — an
            // injected script cannot phone home (connect-src), cannot load
            // code from elsewhere (script-src 'self'), cannot reframe the site
            // (frame-ancestors), and cannot repoint a form (form-action).
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              // Cloudinary is the single remote host for images and videos.
              "img-src 'self' data: blob: https://res.cloudinary.com",
              // Allow the Cloudinary promotional video to stream.
              "media-src 'self' https://res.cloudinary.com",
              "font-src 'self' data:",
              "connect-src 'self'",
              // Payment is cash on delivery; nothing is embedded.
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
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
