import dotenv from 'dotenv';
dotenv.config();

export default {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  
  server: {
    trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  cache: {
    profileTTL: parseInt(process.env.CACHE_PROFILE_TTL || '600', 10), // 10 minutes
    videosTTL: parseInt(process.env.CACHE_VIDEOS_TTL || '300', 10), // 5 minutes
    storiesTTL: parseInt(process.env.CACHE_STORIES_TTL || '120', 10), // 2 minutes
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    downloadMaxRequests: parseInt(process.env.RATE_LIMIT_DOWNLOAD_MAX || '20', 10),
  },
  
  tiktok: {
    userAgent: process.env.TIKTOK_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    baseUrl: 'https://www.tiktok.com',
    timeout: parseInt(process.env.TIKTOK_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.TIKTOK_MAX_RETRIES || '3', 10),
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: false,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.LOG_PRETTY === 'true',
  },
};