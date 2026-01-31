import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {}
  },
  transpilePackages: ['@uiw/react-codemirror', '@codemirror/*']
};

export default nextConfig;
