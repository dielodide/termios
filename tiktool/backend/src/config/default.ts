export const config = {
  port: parseInt(process.env.PORT || '3001'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  tiktokUserAgent: process.env.TIKTOK_USER_AGENT ||
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  httpProxy: process.env.HTTP_PROXY || null,
  cache: {
    profileTTL: parseInt(process.env.CACHE_PROFILE_TTL || '300'),
    videosTTL: parseInt(process.env.CACHE_VIDEOS_TTL || '180'),
    storiesTTL: parseInt(process.env.CACHE_STORIES_TTL || '60'),
  },
  rateLimit: {
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '30'),
  },
  redisUrl: process.env.REDIS_URL || null,
};
