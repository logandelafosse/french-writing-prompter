import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/history", destination: "/historique", permanent: true },
      {
        source: "/history/:path*",
        destination: "/historique/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
