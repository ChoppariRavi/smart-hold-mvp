import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // <-- CRITICAL: Compiles the Next.js app down to raw static files
  images: {
    unoptimized: true, // Required for static export mode
  }
};

export default nextConfig;
