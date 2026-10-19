/** @type {import('next').NextConfig} */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' http: https: blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data:;
  media-src 'self' blob: data:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' ws: wss:;
  frame-src 'self';
  frame-ancestors 'self';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  async rewrites() {
    const backend = process.env.INTERNAL_API_URL || 'http://localhost:8000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/static/:path*', destination: `${backend}/static/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

export default nextConfig;


