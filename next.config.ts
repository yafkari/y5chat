import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  async rewrites() {
    return [
      // More to come!
      
      {
        source: '/((?!api).*)',
        destination: '/static-app-shell',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'y5chat-dev.44d6893d7e4bd439fd619c778d8555d0.r2.cloudflarestorage.com'
      }
    ],
  },
};

export default nextConfig;