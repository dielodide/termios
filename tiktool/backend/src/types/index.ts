export interface TikTokProfile {
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  stats: {
    followers: number;
    following: number;
    likes: number;
    videosCount: number;
  };
  profileId?: string;
  secUid?: string;
}

export interface TikTokVideo {
  videoId: string;
  description: string;
  createdAt: string;
  stats: {
    plays: number;
    likes: number;
    comments: number;
    shares: number;
  };
  thumbnailUrl: string;
  videoUrl: string;
}

export interface TikTokRepost extends TikTokVideo {
  originalAuthor: {
    username: string;
    profileUrl: string;
  };
}

export interface TikTokStory {
  storyId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  expiresAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

export interface TikTokClientConfig {
  userAgent: string;
  timeout: number;
  maxRetries: number;
}