import { Router, Request, Response } from 'express';
import axios from 'axios';
import { resolveVideoUrl, resolveStoryUrl } from '../lib/tiktokClient';
import { logger } from '../lib/logger';
import { config } from '../config/default';

const router = Router();

const streamHeaders = {
  'Referer': 'https://www.tiktok.com/',
  'User-Agent': config.tiktokUserAgent,
};

router.get('/video/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const username = String(req.query.username || '');
  if (!videoId || !username) return res.status(400).json({ error: 'videoId and username required' });
  try {
    const videoUrl = await resolveVideoUrl(videoId, username);
    res.setHeader('Content-Disposition', `attachment; filename="tiktok-${videoId}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');
    const stream = await axios.get(videoUrl, { responseType: 'stream', headers: streamHeaders });
    stream.data.pipe(res);
  } catch (err: any) {
    logger.error({ err, videoId }, 'Video download error');
    if (err.message === 'VIDEO_NOT_FOUND') return res.status(404).json({ error: 'Video not found' });
    res.status(500).json({ error: 'Download failed' });
  }
});

router.get('/story/:storyId', async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const username = String(req.query.username || '');
  if (!storyId || !username) return res.status(400).json({ error: 'storyId and username required' });
  try {
    const { url, type } = await resolveStoryUrl(storyId, username);
    const ext = type === 'video' ? 'mp4' : 'jpg';
    const ct = type === 'video' ? 'video/mp4' : 'image/jpeg';
    res.setHeader('Content-Disposition', `attachment; filename="tiktok-story-${storyId}.${ext}"`);
    res.setHeader('Content-Type', ct);
    const stream = await axios.get(url, { responseType: 'stream', headers: streamHeaders });
    stream.data.pipe(res);
  } catch (err: any) {
    logger.error({ err, storyId }, 'Story download error');
    if (err.message === 'STORY_NOT_FOUND') return res.status(404).json({ error: 'Story not found' });
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
