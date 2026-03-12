import { Router, Request, Response } from 'express';
import { getProfile, getVideos, getReposts, getStories } from '../lib/tiktokClient';
import { logger } from '../lib/logger';

const router = Router();
const usernameRegex = /^[a-zA-Z0-9_.]{2,30}$/;

function validateUsername(req: Request, res: Response): string | null {
  const raw = (req.params.username || '').replace(/^@/, '').trim();
  if (!usernameRegex.test(raw)) {
    res.status(400).json({ error: 'Invalid username format' });
    return null;
  }
  return raw;
}

router.get('/:username', async (req: Request, res: Response) => {
  const username = validateUsername(req, res);
  if (!username) return;
  try {
    const profile = await getProfile(username);
    res.json(profile);
  } catch (err: any) {
    if (err.message === 'PROFILE_NOT_FOUND') return res.status(404).json({ error: 'Profile not found or private' });
    logger.error({ err, username }, 'Profile route error');
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/:username/videos', async (req: Request, res: Response) => {
  const username = validateUsername(req, res);
  if (!username) return;
  const cursor = String(req.query.cursor || '0');
  const limit = Math.min(parseInt(String(req.query.limit || '20')), 30);
  try {
    const result = await getVideos(username, cursor, limit);
    res.json(result);
  } catch (err) {
    logger.error({ err, username }, 'Videos route error');
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

router.get('/:username/reposts', async (req: Request, res: Response) => {
  const username = validateUsername(req, res);
  if (!username) return;
  const cursor = String(req.query.cursor || '0');
  const limit = Math.min(parseInt(String(req.query.limit || '20')), 30);
  try {
    const result = await getReposts(username, cursor, limit);
    res.json(result);
  } catch (err) {
    logger.error({ err, username }, 'Reposts route error');
    res.status(500).json({ error: 'Failed to fetch reposts' });
  }
});

router.get('/:username/stories', async (req: Request, res: Response) => {
  const username = validateUsername(req, res);
  if (!username) return;
  try {
    const result = await getStories(username);
    res.json(result);
  } catch (err) {
    logger.error({ err, username }, 'Stories route error');
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

export default router;
