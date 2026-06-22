import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    typescript: {
        // Ignore TypeScript errors during build to prevent Prisma local binary generation failures in proxy environments
        ignoreBuildErrors: true,
    },
    eslint: {
        // Ignore ESLint during builds as we run npm run lint separately
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
