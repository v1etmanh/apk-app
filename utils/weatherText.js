// Server trả mô tả thời tiết bằng tiếng Việt (vd "Có mây") → dịch theo ngôn ngữ đang chọn.
// Khớp chính xác trước, sau đó theo từ khoá; không nhận ra thì giữ nguyên chữ gốc.

const EXACT = {
  'đang tải...': 'loading',
  'không rõ': 'unknown',
  'không rõ (offline)': 'offline',
  'không rõ (fallback)': 'fallback',
  'giông bão': 'thunderstorm',
  'mưa phùn': 'drizzle',
  'mưa': 'rain',
  'tuyết': 'snow',
  'sương mù': 'mist',
  'sương dày': 'fog',
  'mờ sương': 'haze',
  'trời quang': 'clear',
  'có mây': 'clouds',
};

// Thứ tự quan trọng: cụm cụ thể đứng trước cụm chung
const KEYWORDS = [
  [['giông', 'bão', 'thunder', 'storm'], 'thunderstorm'],
  [['mưa phùn', 'drizzle'], 'drizzle'],
  [['mưa', 'rain'], 'rain'],
  [['tuyết', 'snow'], 'snow'],
  [['sương dày', 'fog'], 'fog'],
  [['mờ sương', 'haze'], 'haze'],
  [['sương', 'mist'], 'mist'],
  [['mây', 'cloud'], 'clouds'],
  [['quang', 'nắng', 'clear', 'sun'], 'clear'],
];

export function weatherConditionKey(condition) {
  const c = String(condition || '').trim().toLowerCase();
  if (!c) return null;
  if (EXACT[c]) return EXACT[c];
  for (const [words, key] of KEYWORDS) {
    if (words.some(w => c.includes(w))) return key;
  }
  return null;
}

export function translateWeatherCondition(condition, t) {
  const key = weatherConditionKey(condition);
  return key ? t(`weatherCond.${key}`) : (condition || '');
}
