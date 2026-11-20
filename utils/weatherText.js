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

// Phân loại thời tiết → 1 trong 6 nhóm dùng cho animation & texture nền
// ('sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy').
export function getWeatherType(condition = '', icon = '') {
  const s = (String(condition || '') + String(icon || '')).toLowerCase();
  if (s.includes('thunder') || s.includes('storm') || s.includes('giông') || s.includes('bão') || s.includes('⛈')) return 'stormy';
  if (s.includes('snow') || s.includes('tuyết') || s.includes('❄') || s.includes('🌨')) return 'snowy';
  if (s.includes('fog') || s.includes('mist') || s.includes('haze') || s.includes('sương') || s.includes('🌫')) return 'foggy';
  if (s.includes('rain') || s.includes('drizzle') || s.includes('mưa') || s.includes('🌧') || s.includes('🌦')) return 'rainy';
  if (s.includes('cloud') || s.includes('mây') || s.includes('⛅') || s.includes('🌥') || s.includes('☁')) return 'cloudy';
  return 'sunny';
}

// Emoji thời tiết theo mô tả + nhiệt độ (dùng ở Home)
export function weatherIcon(cond = '', temp = 30) {
  const c = String(cond || '').toLowerCase();
  if (c.includes('rain') || c.includes('mưa'))  return '🌧️';
  if (c.includes('storm') || c.includes('bão')) return '⛈️';
  if (c.includes('cloud') || c.includes('mây')) return '⛅';
  if (c.includes('fog')  || c.includes('sương'))return '🌫️';
  if (temp > 33) return '☀️';
  if (temp > 28) return '🌤️';
  return '🌥️';
}

// weatherData (store) → nhóm thời tiết; null khi chưa có dữ liệu
export function weatherTypeFromData(data) {
  if (!data) return null;
  return getWeatherType(data.condition, weatherIcon(data.condition, data.temperature));
}
