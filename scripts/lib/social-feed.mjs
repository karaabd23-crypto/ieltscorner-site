function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToPlainText(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength = 180) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export async function resolveYouTubeChannelId(channelUrl) {
  const envChannelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
  if (envChannelId) {
    return envChannelId;
  }

  const directMatch = String(channelUrl || '').match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  try {
    const response = await fetch(channelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IELTSCornerDigest/1.0)',
      },
    });

    if (!response.ok) {
      return '';
    }

    const html = await response.text();
    const channelMatch = html.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
    return channelMatch?.[1] || '';
  } catch {
    return '';
  }
}

function parseYouTubeEntry(entry, fallbackUrl) {
  const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1]?.trim();
  const titleRaw = entry.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || 'Latest YouTube lesson';
  const url = entry.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim()
    || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : fallbackUrl);
  const publishedAt = entry.match(/<published>([^<]+)<\/published>/i)?.[1]?.trim() || '';

  if (!videoId) {
    return null;
  }

  const title = decodeXmlEntities(titleRaw);
  return {
    title,
    url,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    publishedAt,
    preview: truncate(title, 90),
  };
}

export async function getLatestYouTubeVideos(channelUrl, limit = 5) {
  const channelId = await resolveYouTubeChannelId(channelUrl);
  if (!channelId) {
    return [];
  }

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(10, Number.parseInt(String(limit), 10)))
    : 5;

  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
    if (!entries.length) {
      return [];
    }

    const videos = [];
    for (const match of entries) {
      const parsed = parseYouTubeEntry(match[1], channelUrl);
      if (!parsed) {
        continue;
      }

      videos.push(parsed);
      if (videos.length >= safeLimit) {
        break;
      }
    }

    return videos;
  } catch {
    return [];
  }
}

export async function getLatestYouTubeVideo(channelUrl) {
  const videos = await getLatestYouTubeVideos(channelUrl, 1);
  return videos[0] || null;
}

function resolveTelegramSlug(channelUrl) {
  const normalized = String(channelUrl || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^t\.me\//i, '')
    .replace(/^s\//i, '');

  const slug = normalized.split(/[/?#]/)[0]?.trim();
  return slug ? slug.replace(/^@/, '') : '';
}

export async function getTelegramChannelSnapshot(channelUrl) {
  const slug = resolveTelegramSlug(channelUrl);
  if (!slug) {
    return null;
  }

  try {
    const response = await fetch(`https://t.me/s/${slug}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IELTSCornerDigest/1.0)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const subscriberCount = html.match(/tgme_channel_info_counter[^>]*>\s*([^<]+)\s*</i)?.[1]?.trim() || '';
    const title = htmlToPlainText(html.match(/tgme_channel_info_header_title[^>]*>([\s\S]*?)<\/div>/i)?.[1] || "Kay's English Corner");
    const firstMessage = html.match(/<div class="tgme_widget_message_wrap[\s\S]*?<\/div>\s*<\/div>/i)?.[0] || '';
    if (!firstMessage) {
      return {
        title,
        url: `https://t.me/${slug}`,
        subscriberCount,
        preview: '',
      };
    }

    const text = htmlToPlainText(firstMessage.match(/tgme_widget_message_text[\s\S]*?>([\s\S]*?)<\/div>/i)?.[1] || '');
    const url = firstMessage.match(/tgme_widget_message_date[^>]*href="([^"]+)"/i)?.[1]?.trim() || `https://t.me/${slug}`;
    const publishedAt = firstMessage.match(/<time[^>]*datetime="([^"]+)"/i)?.[1]?.trim() || '';

    return {
      title,
      url,
      subscriberCount,
      publishedAt,
      text,
      preview: truncate(text, 170),
    };
  } catch {
    return null;
  }
}

export async function getLatestInstagramPost(username) {
  const posts = await getLatestInstagramPosts(username, 1);
  return posts[0] || null;
}

function normalizeInstagramPost(node, handle) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const caption = String(node?.edge_media_to_caption?.edges?.[0]?.node?.text || '').trim();
  const shortcode = String(node?.shortcode || '').trim();
  const url = shortcode ? `https://www.instagram.com/p/${shortcode}/` : `https://www.instagram.com/${handle}/`;
  const imageUrl = String(node?.thumbnail_src || node?.display_url || '').trim();
  const publishedAt = node?.taken_at_timestamp
    ? new Date(Number(node.taken_at_timestamp) * 1000).toISOString()
    : '';

  return {
    title: caption ? truncate(caption, 90) : `Instagram post from @${handle}`,
    url,
    caption,
    preview: truncate(caption || `Instagram post from @${handle}`, 170),
    imageUrl,
    publishedAt,
  };
}

export async function getLatestInstagramPosts(username, limit = 5) {
  const handle = String(username || '').trim().replace(/^@/, '');
  if (!handle) {
    return [];
  }

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(10, Number.parseInt(String(limit), 10)))
    : 5;

  try {
    const response = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`, {
      headers: {
        Accept: 'application/json',
        Referer: `https://www.instagram.com/${handle}/`,
        'User-Agent': 'Mozilla/5.0 (compatible; IELTSCornerDigest/1.0)',
        'x-ig-app-id': '936619743392459',
        'x-requested-with': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const user = data?.data?.user;
    const edges = Array.isArray(user?.edge_owner_to_timeline_media?.edges)
      ? user.edge_owner_to_timeline_media.edges
      : [];

    if (!edges.length) {
      return [];
    }

    const posts = [];
    for (const edge of edges) {
      const normalized = normalizeInstagramPost(edge?.node, handle);
      if (!normalized) {
        continue;
      }

      posts.push(normalized);
      if (posts.length >= safeLimit) {
        break;
      }
    }

    return posts;
  } catch {
    return [];
  }
}
