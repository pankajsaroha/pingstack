import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  serverExternalPackages: ["bullmq", "ioredis", "xlsx"],
};

export default nextConfig;
