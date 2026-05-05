import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
