import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Set turbopack.root to the absolute frontend directory to avoid warnings
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/dashboar",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/dashbord",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/dashbaord",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
