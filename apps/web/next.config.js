const path = require('path');

// The Docker image builds with NEXT_OUTPUT=standalone to get a small self-contained server.
// Normal builds (pnpm build / next start) are unchanged.
const standalone = process.env.NEXT_OUTPUT === 'standalone';

// GitHub Pages build: NEXT_OUTPUT=export writes plain static files to ./out. The site then lives under
// https://<owner>.github.io/<repo>/, so NEXT_PUBLIC_BASE_PATH=/<repo> is set for that build.
const exportSite = process.env.NEXT_OUTPUT === 'export';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(standalone && {
    output: 'standalone',
    // In a monorepo the server must trace files from the repository root to include workspace packages
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }),
  ...(exportSite && {
    output: 'export',
    // /auth/login/index.html: works on a static host without rewrite rules
    trailingSlash: true,
    // Where the finished static files are written. The build itself still compiles into .next, so do not run an
    // export build while `next dev` is running (check builds use NEXT_DIST_DIR below instead).
    distDir: '.next-export',
  }),
  // Check builds (the pre-commit hook) set NEXT_DIST_DIR so they compile in their own folder. Without it, a build
  // compiles into .next, which is the folder a running `next dev` is serving from, and the dev server starts failing.
  ...(process.env.NEXT_DIST_DIR && { distDir: process.env.NEXT_DIST_DIR }),
  ...(basePath && { basePath }),
  transpilePackages: ['@career-gap-ai/shared'],
  images: exportSite
    ? { unoptimized: true } // image optimisation needs a server
    : {
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
  ...(!exportSite && {
    experimental: {
      serverActions: { allowedOrigins: ['localhost:3000'] },
    },
  }),
};

module.exports = nextConfig;
