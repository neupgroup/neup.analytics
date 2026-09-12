import type {NextConfig} from 'next';
import { getEnvVariable } from '@neup/core/helpers/env';

const basePath = getEnvVariable('APP_BASEPATH', true);
const assetPrefix = getEnvVariable('APP_BASEPATH', true);

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  basePath: basePath,
  assetPrefix: assetPrefix,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'neupcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'neupgroup.com',
      },

    ],
  },
};

export default nextConfig;
