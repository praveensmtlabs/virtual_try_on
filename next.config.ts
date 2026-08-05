import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile three.js for server/client compatibility
  transpilePackages: ["three"],
  // framer-motion uses "use client" components exclusively — no special config needed.
  // serverExternalPackages causes useContext null errors server-side — intentionally omitted.
};

export default nextConfig;
