/** @type {import('next').NextConfig} */
const nextConfig = {
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
