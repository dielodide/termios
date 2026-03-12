import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/default';
import { initCache } from './lib/cache';
import { logger } from './lib/logger';
import profileRouter from './routes/profile';
import downloadRouter from './routes/download';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, methods: ['GET'], credentials: false }));
app.use(express.json());

app.use('/api/profile', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
}));

app.use('/api/profile', profileRouter);
app.use('/api/download', downloadRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function main() {
  await initCache();
  app.listen(config.port, () => {
    logger.info(`TikTool backend running on port ${config.port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
