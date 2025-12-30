import type { NextConfig } from "next";

// Optional bundle analyzer - enabled with ANALYZE=true environment variable
const withBundleAnalyzer =
  process.env.ANALYZE === "true"
    ? require("@next/bundle-analyzer")({ enabled: true })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  // Enable gzip compression
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dgalywyr863hv.cloudfront.net',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Experimental optimizations
  experimental: {
    // Optimize CSS for smaller bundles
    optimizeCss: true,
  },
};

export default withBundleAnalyzer(nextConfig);
