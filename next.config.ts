import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The accessibility check and the smoke test build beside the dev server (Tech.md §16).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Profile photos are up to 2 MB; the multipart body needs a little room past that.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
