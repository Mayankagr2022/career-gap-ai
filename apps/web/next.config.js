const path = require('path');

// The Docker image builds with NEXT_OUTPUT=standalone to get a small self-contained server.
// Normal builds (pnpm build / next start) are unchanged.
const standalone = process.env.NEXT_OUTPUT === 'standalone';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(standalone && {
    output: 'standalone',
    // In a monorepo the server must trace files from the repository root to include workspace packages
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }),
  transpilePackages: ['@career-gap-ai/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
      { protocol: 'https', hostname: 'www.gravatar.com' },
      { protocol: 'https', hostname: 'gravatar.com' },
      { protocol: 'http', hostname: 'localhost', port: '3001' },
      { protocol: 'http', hostname: 'localhost', port: '3000' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
};

module.exports = nextConfig;
