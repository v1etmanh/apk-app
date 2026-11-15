// utils/price.js
// Định dạng giá ước tính (VND) và khoảng giá dùng cho bộ lọc kết quả.

// Bản dự phòng khi server chưa trả `price_bands` (server cũ / cache offline).
// PHẢI khớp PRICE_BANDS trong demo_server/app.py.
export const DEFAULT_PRICE_BANDS = [
  { level: 1, min: 0, max: 50000 },
  { level: 2, min: 50000, max: 120000 },
  { level: 3, min: 120000, max: null },
];

/** Giá hợp lệ để hiển thị (số dương). */
export const hasPrice = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * 56300 → "56k", 1250000 → "1,3tr" (vi) / "1.3M" (en). Trả null nếu không có giá.
 */
export const formatVnd = (v, lang = 'vi') => {
  if (!hasPrice(v)) return null;
  if (v >= 1000000) {
    const m = (Math.round(v / 100000) / 10).toString();
    return lang === 'en' ? `${m}M` : `${m.replace('.', ',')}tr`;
  }
  return `${Math.max(1, Math.round(v / 1000))}k`;
};

/** Nhãn chip cho một khoảng giá: "Dưới 50k" / "50k–120k" / "Trên 120k". */
export const priceBandLabel = (band, t, lang = 'vi') => {
  if (!band) return '';
  const min = formatVnd(band.min, lang);
  const max = formatVnd(band.max, lang);
  if (!min && max) return t('resultFilters.priceUnder', { max });
  if (min && !max) return t('resultFilters.priceOver', { min });
  return t('resultFilters.priceBetween', { min, max });
};

/** Lấy danh sách khoảng giá hợp lệ từ response, nếu không có thì dùng mặc định. */
export const sanitizePriceBands = (raw) => {
  if (!Array.isArray(raw) || raw.length !== 3) return DEFAULT_PRICE_BANDS;
  const ok = raw.every((b, i) => b && b.level === i + 1);
  return ok ? raw : DEFAULT_PRICE_BANDS;
};
