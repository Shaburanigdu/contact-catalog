/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image
  output: 'standalone',

  // Hide the dev-mode indicator badge
  devIndicators: false,

  // Uploaded images are served from /public/uploads on the same origin,
  // so no remote image hosts need to be allowed.
}

module.exports = nextConfig
