import 'dotenv/config';

export interface Config {
  googleMapsApiKey: string;
  rateLimitMs: number;
  cacheDbPath: string;
  outputDir: string;
  serverPort: number;
}

export function loadConfig(): Config {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleMapsApiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is required');
  }

  return {
    googleMapsApiKey,
    rateLimitMs: parseInt(process.env.RATE_LIMIT_MS || '100', 10),
    cacheDbPath: process.env.CACHE_DB_PATH || './cache.db',
    outputDir: process.env.OUTPUT_DIR || './data',
    serverPort: parseInt(process.env.SERVER_PORT || '3000', 10),
  };
}

export const config = loadConfig();
