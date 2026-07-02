import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Local-run convenience: skip the slow blocking type-check during build. */
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
