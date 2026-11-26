import type { NextConfig } from "next";

// Static export: the site is fully pre-rendered. Interactive 3D is a lazy client island.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
