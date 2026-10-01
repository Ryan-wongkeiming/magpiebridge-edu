// Next.js configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // This project lives inside a OneDrive folder. OneDrive marks files under
  // .next as reparse points, which Next.js's cache cleanup misreads as
  // symbolic links; the readlink call then fails with EINVAL and the dev
  // server refuses to start. Skipping the cleanup avoids that crash.
  cleanDistDir: false,

  experimental: {
    serverActions: {
      enabled: true,
    },
  },
}

module.exports = nextConfig
