import axios from 'axios';
import { YouTubeUrlSchema, VideoIdSchema } from '@yia/shared';
import { getEnv } from '../utils/env';

export const extractVideoId = (url: string): string | null => {
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
  return match ? match[1] : null;
};

export const validateYouTubeUrl = (url: string) => {
  const parsed = YouTubeUrlSchema.safeParse({ url });
  if (!parsed.success) {
    return { valid: false, error: parsed.error.flatten().fieldErrors.url?.[0] ?? 'Invalid URL' };
  }
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { valid: false, error: 'Could not parse video id' };
  }
  return { valid: true, videoId };
};

export const fetchVideoMeta = async (videoId: string) => {
  VideoIdSchema.parse({ videoId });
  const env = getEnv();
  if (!env.YOUTUBE_API_KEY) {
    throw new Error('YouTube API key missing');
  }
  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      id: videoId,
      part: 'snippet,contentDetails,statistics',
      key: env.YOUTUBE_API_KEY
    }
  });
  if (!data.items?.length) {
    throw new Error('Video not found');
  }
  const [item] = data.items;
  return {
    id: videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnails: item.snippet.thumbnails,
    statistics: item.statistics,
    duration: item.contentDetails.duration
  };
};

export const fetchCaptions = async (videoId: string) => {
  const env = getEnv();
  if (!env.YOUTUBE_OAUTH_TOKEN) {
    throw new Error('Captions download requires OAuth token');
  }
  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/captions', {
    params: {
      videoId,
      part: 'snippet',
      key: env.YOUTUBE_API_KEY
    },
    headers: {
      Authorization: `Bearer ${env.YOUTUBE_OAUTH_TOKEN}`
    }
  });
  return data;
};
