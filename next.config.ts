import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow server to read .env.production when running standalone
  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  // Compress responses (Caddy also compresses, but this helps if behind other proxies)
  compress: true,
  // Powered-by header off (security)
  poweredByHeader: false,
  // Cache static aggressively
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
