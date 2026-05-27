const isProd = process.env.NODE_ENV === 'production';
const repo = 'thorndon-tennis-club-day';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isProd ? `/${repo}` : '',
  assetPrefix: isProd ? `/${repo}/` : '',
  trailingSlash: true,
};

export default nextConfig;
