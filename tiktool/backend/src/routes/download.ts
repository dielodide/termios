import { Router, Request, Response } from 'express';
import axios from 'axios';
import { resolveVideoUrl } from '../lib/tiktokClient';
import { logger } from '../lib/logger';

const router = Router();

router.get('/video/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const username = String(req.query.username || '');
  if (!videoId || !username) {
    return res.status(400).json({ error: 'videoId and username required' });
  }
  try {
    const videoUrl = await resolveVideoUrl(videoId, username);
    res.setHeader('Content-Disposition', `attachment; filename="tiktok-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    const stream = await axios.get(videoUrl, {
      responseType: 'stream',
      headers: {
        'Referer': 'https://www.tiktok.com/',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      },
    });
    stream.data.pipe(res);
  } catch (err: any) {
    logger.error({ err, videoId }, 'Download route error');
    if (err.message === 'VIDEO_NOT_FOUND') {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
