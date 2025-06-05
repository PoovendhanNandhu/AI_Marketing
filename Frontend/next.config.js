/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
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
        ...(config.resolve.alias || {}),
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
