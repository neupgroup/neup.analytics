import type {NextConfig} from 'next';
// import { getBasePath } from './neupsys/identity';

function normalizeBasePath(value: string | undefined): string {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
}

// const basePath = normalizeBasePath(
//   getBasePath()
// );

const basePath = normalizeBasePath(
  process.env.APP_BASEPATH || process.env.NEXT_PUBLIC_APP_BASEPATH
);

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  basePath,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
