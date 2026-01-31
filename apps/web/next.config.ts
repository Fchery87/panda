import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@uiw/react-codemirror', '@codemirror/*'],
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL
  }
};

export default nextConfig;
