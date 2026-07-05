import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Lets you open the app from your phone/another device on the same
  // wifi during development. Add your machine's IP if it changes
  // (shown in the "Network:" line when you run `npm run dev`).
  allowedDevOrigins: ["192.168.1.105"],
};

export default nextConfig;
