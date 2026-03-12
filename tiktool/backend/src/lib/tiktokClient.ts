import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { config } from '../config/default';
import { cacheGet, cacheSet } from './cache';
import { logger } from './logger';
import type { TikTokProfile, TikTokVideo, TikTokStory, VideoListResponse, StoriesResponse } from '../types/tiktok';

function buildHttpClient(): AxiosInstance {
  const axiosConfig: any = {
    timeout: 12000,
    headers: {
      'User-Agent': config.tiktokUserAgent,
      'Accept-Language': 'fr-CA,fr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.tiktok.com/',
    },
  };
  if (config.httpProxy) {
    const url = new URL(config.httpProxy);
    axiosConfig.proxy = {
      host: url.hostname,
      port: parseInt(url.port),
      protocol: url.protocol.replace(':', ''),
    };
  }
  return axios.create(axiosConfig);
}

const http = buildHttpClient();

function extractSigi(html: string): any {
  const $ = cheerio.load(html);
  let sigi: any = null;
  $('script[id="SIGI_STATE"]').each((_, el) => {
    try { sigi = JSON.parse($(el).html() || ''); } catch {}
  });
  if (!sigi) {
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      const match = content.match(/window\['SIGI_STATE'\]\s*=\s*(\{.+\});/);
      if (match) {
        try { sigi = JSON.parse(match[1]); } catch {}
      }
    });
  }
  return sigi;
}

export async function getProfile(username: string): Promise<TikTokProfile> {
  const cacheKey = `profile:${username.toLowerCase()}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://www.tiktok.com/@${username}`;
  const res = await http.get(url);
  const sigi = extractSigi(res.data);

  if (!sigi) throw new Error('Unable to parse TikTok page data');

  // Navigate SIGI_STATE for user info
  const userModule = sigi?.UserModule?.users || sigi?.SEOState?.metaParams || {};
  const userKey = Object.keys(sigi?.UserModule?.users || {})[0];
  const user = sigi?.UserModule?.users?.[userKey] || {};
  const stats = sigi?.UserModule?.stats?.[userKey] || {};

  if (!user?.id && !user?.uniqueId) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const profile: TikTokProfile = {
    username: user.uniqueId || username,
    displayName: user.nickname || username,
    avatarUrl: user.avatarLarger || user.avatarMedium || '',
    bio: user.signature || '',
    stats: {
      followers: stats.followerCount || 0,
      following: stats.followingCount || 0,
      likes: stats.heartCount || stats.heart || 0,
      videosCount: stats.videoCount || 0,
    },
    profileId: user.id || '',
    secUid: user.secUid || '',
    isPrivate: user.privateAccount || false,
  };

  await cacheSet(cacheKey, JSON.stringify(profile), config.cache.profileTTL);
  logger.info({ username }, 'Profile fetched');
  return profile;
}

export async function getVideos(username: string, cursor = '0', limit = 20): Promise<VideoListResponse> {
  const cacheKey = `videos:${username.toLowerCase()}:${cursor}:${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  const url = `https://www.tiktok.com/@${username}`;
  const res = await http.get(url);
  const sigi = extractSigi(res.data);

  const itemModule = sigi?.ItemModule || {};
  const allVideos: TikTokVideo[] = Object.values(itemModule).map((item: any) => ({
    videoId: item.id,
    description: item.desc || '',
    createdAt: new Date(item.createTime * 1000).toISOString(),
    stats: {
      plays: item.stats?.playCount || 0,
      likes: item.stats?.diggCount || 0,
      comments: item.stats?.commentCount || 0,
      shares: item.stats?.shareCount || 0,
    },
    thumbnailUrl: item.video?.cover || item.video?.dynamicCover || '',
    videoUrl: item.video?.playAddr || item.video?.downloadAddr || '',
    duration: item.video?.duration || 0,
    isRepost: false,
  }));

  const result: VideoListResponse = { items: allVideos, nextCursor: null };
  await cacheSet(cacheKey, JSON.stringify(result), config.cache.videosTTL);
  return result;
}

export async function getReposts(username: string, cursor = '0', limit = 20): Promise<VideoListResponse> {
  const cacheKey = `reposts:${username.toLowerCase()}:${cursor}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  // TikTok repost endpoint via app API (public)
  try {
    const profile = await getProfile(username);
    const secUid = encodeURIComponent(profile.secUid);
    const apiUrl = `https://www.tiktok.com/api/repost/item_list/?aid=1988&secUid=${secUid}&count=${limit}&cursor=${cursor}`;
    const apiRes = await http.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Referer': `https://www.tiktok.com/@${username}`,
      },
    });

    const data = apiRes.data;
    const items: TikTokVideo[] = (data?.itemList || []).map((item: any) => ({
      videoId: item.id,
      description: item.desc || '',
      createdAt: new Date(item.createTime * 1000).toISOString(),
      stats: {
        plays: item.stats?.playCount || 0,
        likes: item.stats?.diggCount || 0,
        comments: item.stats?.commentCount || 0,
        shares: item.stats?.shareCount || 0,
      },
      thumbnailUrl: item.video?.cover || '',
      videoUrl: item.video?.playAddr || item.video?.downloadAddr || '',
      duration: item.video?.duration || 0,
      isRepost: true,
      originalAuthor: {
        username: item.author?.uniqueId || '',
        profileUrl: `https://www.tiktok.com/@${item.author?.uniqueId || ''}`,
      },
    }));

    const result: VideoListResponse = {
      items,
      nextCursor: data.hasMore ? String(data.cursor) : null,
    };
    await cacheSet(cacheKey, JSON.stringify(result), config.cache.videosTTL);
    return result;
  } catch (err) {
    logger.warn({ username, err }, 'Reposts fetch failed, returning empty');
    return { items: [], nextCursor: null };
  }
}

export async function getStories(username: string): Promise<StoriesResponse> {
  const cacheKey = `stories:${username.toLowerCase()}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const profile = await getProfile(username);
    const secUid = encodeURIComponent(profile.secUid);
    const apiUrl = `https://www.tiktok.com/api/user/story/?aid=1988&secUid=${secUid}`;
    const res = await http.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Referer': `https://www.tiktok.com/@${username}`,
      },
    });

    const now = Date.now();
    const items: TikTokStory[] = (res.data?.story?.storyList || []).map((s: any) => ({
      storyId: s.id,
      mediaType: s.video?.playAddr ? 'video' : 'image',
      mediaUrl: s.video?.playAddr || s.imagePost?.images?.[0]?.imageURL?.urlList?.[0] || '',
      thumbnailUrl: s.video?.cover || s.imagePost?.images?.[0]?.imageURL?.urlList?.[0] || '',
      createdAt: new Date((s.createTime || now / 1000) * 1000).toISOString(),
      expiresAt: new Date(((s.createTime || now / 1000) + 86400) * 1000).toISOString(),
    }));

    const result: StoriesResponse = { items };
    await cacheSet(cacheKey, JSON.stringify(result), config.cache.storiesTTL);
    return result;
  } catch (err) {
    logger.warn({ username, err }, 'Stories fetch failed');
    return { items: [] };
  }
}

export async function resolveVideoUrl(videoId: string, username: string): Promise<string> {
  const cached = await cacheGet(`videourl:${videoId}`);
  if (cached) return cached;

  const videos = await getVideos(username);
  const found = videos.items.find(v => v.videoId === videoId);
  if (!found || !found.videoUrl) throw new Error('VIDEO_NOT_FOUND');

  await cacheSet(`videourl:${videoId}`, found.videoUrl, 120);
  return found.videoUrl;
}
