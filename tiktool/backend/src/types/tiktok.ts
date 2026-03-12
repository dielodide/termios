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
  profileId: string;
  secUid: string;
  isPrivate: boolean;
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
  duration: number;
  isRepost: boolean;
  originalAuthor?: {
    username: string;
    profileUrl: string;
  };
}

export interface TikTokStory {
  storyId: string;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface VideoListResponse {
  items: TikTokVideo[];
  nextCursor: string | null;
}

export interface StoriesResponse {
  items: TikTokStory[];
}
