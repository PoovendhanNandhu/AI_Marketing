/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Standard Next.js build for Netlify (not static export since we need auth routes)
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    // Add webpack aliases for path resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/hooks': path.resolve(__dirname, './hooks'),
    };

    // Handle WebSocket polyfills for browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        'utf-8-validate': false,
        bufferutil: false,
        net: false,
        tls: false,
        fs: false,
        crypto: false,
      };
      
      // Also alias ws away entirely for extra safety
      config.resolve.alias = {
        ...config.resolve.alias,
        ws: false,
        'utf-8-validate': false,
        bufferutil: false,
      };
    }

    // Ignore specific modules that cause issues
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });

    return config;
  },
};

module.exports = nextConfig;
