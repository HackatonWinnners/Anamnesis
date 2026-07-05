/** @type {import("next").NextConfig} */
const internalApiBase = (process.env.NEXT_SERVER_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

const nextConfig = {
  transpilePackages: ["@anamnesis/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
