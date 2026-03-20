/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: [
    "@foundry-x/shared",
    "@axis-ds/ui-react",
    "@axis-ds/theme",
    "@axis-ds/tokens",
  ],
  async rewrites() {
    // rewrites()는 next dev에서만 동작 (output: "export" 빌드 시 무시됨)
    // 프로덕션 API 프록시는 public/_redirects가 담당
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
