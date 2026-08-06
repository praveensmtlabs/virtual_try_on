import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.glb": ["ignore-loader"],
      "*.fbx": ["ignore-loader"],
    },
  },
};

export default nextConfig;
