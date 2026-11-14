// Helpers for the public ingredient-video records returned by the backend.
// The mobile app never stores a Cloudflare or YouTube management key.

export const toIngredientSlug = (name = '') =>
  String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const extractYouTubeVideoId = (value = '') => {
  const url = String(value).trim();
  if (!url) return '';

  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
};

export const toYouTubeThumbnailUrl = (videoId = '') =>
  videoId ? 'https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/hqdefault.jpg' : '';

export const toYouTubeEmbedUrl = (videoId = '') =>
  videoId
    ? 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?playsinline=1&autoplay=1&rel=0'
    : '';

export const YOUTUBE_EMBED_REFERRER =
  process.env.EXPO_PUBLIC_YOUTUBE_EMBED_REFERRER ||
  'https://dailyserver-production.up.railway.app/';

export const toYouTubeEmbedHtml = (videoId = '') => {
  const embedUrl = toYouTubeEmbedUrl(videoId);
  if (!embedUrl) return '<html><body></body></html>';

  return [
    '<!doctype html>',
    '<html><head>',
    '<meta name="referrer" content="strict-origin-when-cross-origin" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />',
    '<style>html,body{margin:0;padding:0;background:#000;width:100%;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%}</style>',
    '</head><body>',
    '<iframe src="' + embedUrl + '" title="YouTube video" ',
    'allow="autoplay; encrypted-media; fullscreen; picture-in-picture" ',
    'allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>',
    '</body></html>',
  ].join('');
};

const CATEGORY_BY_NAME = {
  rau: 'vegetables',
  củ: 'vegetables',
  quả: 'fruits',
  trái: 'fruits',
  thịt: 'meat',
  cá: 'seafood',
  hải: 'seafood',
  gia: 'seasoning',
};

const inferCategory = (category = '', title = '') => {
  if (category) return String(category).trim().toLowerCase();
  const normalized = String(title).toLocaleLowerCase();
  const matched = Object.keys(CATEGORY_BY_NAME).find((key) => normalized.includes(key));
  return matched ? CATEGORY_BY_NAME[matched] : 'other';
};

export const normalizeIngredientVideo = (record = {}, language = 'vi') => {
  const title =
    record.ingredient_name ||
    record.name ||
    record.title ||
    record.ingredient?.name ||
    '';
  const videoUrl =
    record.video_url ||
    record.youtube_url ||
    record.url ||
    (record.youtube_video_id ? 'https://www.youtube.com/watch?v=' + record.youtube_video_id : '');
  const videoId = record.youtube_video_id || extractYouTubeVideoId(videoUrl);
  const slug = record.slug || record.ingredient_id || toIngredientSlug(title);
  const translatedTitle =
    language === 'en'
      ? record.ingredient_name_en || record.name_en || record.title_en || title
      : title;

  if (!translatedTitle || !videoUrl || !videoId) return null;

  return {
    id: String(record.id || slug),
    slug: String(slug),
    title: translatedTitle,
    description: record.description || '',
    category: inferCategory(record.category, translatedTitle),
    videoUrl,
    videoId,
    thumbnailUrl: record.thumbnail_url || toYouTubeThumbnailUrl(videoId),
  };
};

export const normalizeIngredientVideos = (payload, language = 'vi') => {
  const records = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.data || payload?.videos || [];

  return records
    .map((record) => normalizeIngredientVideo(record, language))
    .filter(Boolean);
};
