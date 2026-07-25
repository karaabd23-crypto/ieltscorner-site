import { withLambda } from '@netlify/aws-lambda-compat';
import {
  getLatestInstagramPosts,
  getLatestYouTubeVideos,
} from '../../scripts/lib/social-feed.mjs';

const DEFAULT_YOUTUBE_CHANNEL_URL = (process.env.YOUTUBE_CHANNEL_URL || 'https://www.youtube.com/@KaraAbdolmaleki').trim();
const DEFAULT_INSTAGRAM_USERNAME = (process.env.INSTAGRAM_USERNAME || 'ieltscorner.ca').trim().replace(/^@/, '');

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600',
    },
    body: JSON.stringify(payload),
  };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeYouTubeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return DEFAULT_YOUTUBE_CHANNEL_URL;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `https://${raw.replace(/^\/+/, '')}`;
}

function normalizeInstagramUsername(value) {
  const normalized = String(value || '').trim().replace(/^@/, '');
  return normalized || DEFAULT_INSTAGRAM_USERNAME;
}

async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const query = event.queryStringParameters || {};
    const limit = Math.min(parsePositiveInteger(query.limit, 5), 10);
    const youtubeChannelUrl = normalizeYouTubeUrl(query.youtubeChannelUrl || query.youtube);
    const instagramUsername = normalizeInstagramUsername(query.instagramUsername || query.instagram);
    const instagramUrl = `https://www.instagram.com/${instagramUsername}/`;

    const [youtubeVideos, instagramPosts] = await Promise.all([
      getLatestYouTubeVideos(youtubeChannelUrl, limit),
      getLatestInstagramPosts(instagramUsername, limit),
    ]);

    return json(200, {
      limit,
      youtubeChannelUrl,
      instagramUsername,
      instagramUrl,
      youtubeVideos,
      instagramPosts,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(500, {
      error: error?.message || 'Unable to load social feed',
    });
  }
}

export default withLambda(handler);
