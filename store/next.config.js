/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: false,
  },
  allowedDevOrigins: [
    '192.168.16.120:3000',
    'localhost:3000',
    '127.0.0.1:3000'
  ],
}

module.exports = nextConfig
