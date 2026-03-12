/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export mode
  output: 'export',
  // Disable image optimization (required for static export)
  images: {
    unoptimized: true,
  },
  // Disable linting/typechecking during build to save memory on Render's 512MB limit
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-icons', 'recharts', 'react-circular-progressbar'],
    // Use memory-based worker count to avoid over-allocating on restricted environments like Render
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
