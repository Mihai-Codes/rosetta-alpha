/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests to the FastAPI backend
  async rewrites() {
    return [
      {
        source: '/api/results',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/results`
          : 'http://localhost:8000/api/results',
      },
    ]
  },
  // Tailwind CSS v4 uses postcss plugin
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },
}

export default nextConfig
