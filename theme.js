// Daily Mate — Design System
// Phong cách: tươi mát, gần gũi, hiện đại — phù hợp người Việt

export const C = {
  // Brand - Scrapbook / Journal Theme
  primary:      '#8B5E3C',   // Wood - main brand color
  bg:           '#F5EDDC',   // Parchment - background color
  amber:        '#F59E0B',   // Warm accent

  // Additional Wood Tints
  woodLight:    '#A67C52',
  woodDark:     '#5C3A21',

  // Additional Parchment Tints
  parchmentLight: '#FFF8EA',
  parchmentDark:  '#E6DCC3',

  // Accent Colors
  accentGreen:  '#38B07A',   // Used for "done/eaten" state
  accentRed:    '#E74C3C',   // Used for warnings or deletions
  accentBlue:   '#3498DB',   // Used for info 

  // Surfaces
  surface:      '#FFFFFF',
  surfaceAlt:   '#FDFBFA',

  // Text
  text:         '#3E2723',   // Dark brown text for contrast on parchment
  textMid:      '#5D4037',   // Medium brown
  textLight:    '#8D6E63',   // Light brown hint/placeholder (chỉ dùng cho chữ ≥ 18px hoặc placeholder)
  textSoft:     '#6B4F44',   // Chữ phụ nhỏ — đủ tương phản 4.5:1 trên nền giấy

  // Sổ tay / bóng thoại mèo
  paperStroke:  '#C8A96E',   // Viền giấy, viền bóng thoại
  chipBg:       '#EFE6D2',   // Nền chip trung tính
  seasonBg:     '#FDEBC8',   // Chip "đang mùa" / cảnh báo nhẹ
  seasonText:   '#8A4B0B',
  freshBg:      '#E3F4EA',   // Chip "mát / có sẵn"
  freshText:    '#24563F',
  inkGreen:     '#2F8F62',   // Tick hoàn thành

  // Borders
  border:       '#D7CCC8',
  borderLight:  '#EFEBE9',

  // Status
  success:      '#38B07A',
  danger:       '#FF3B30',
  warning:      '#F59E0B',
  info:         '#007AFF',

  // Shadow
  shadow:       'rgba(92, 58, 33, 0.15)', // Wood-tinted shadow
};

export const R = { sm: 8, md: 12, lg: 16, xl: 20, pill: 28, circle: 999 };

// Ocean accents for the ingredient → recommendation flow; keep the cream page background.
export const OCEAN = {
  primary: '#176BBD',
  dark: '#124C82',
  ink: '#173B59',
  muted: '#486781',
  border: '#9BC5E8',
  borderLight: '#CDE2F3',
  tint: '#F0F7FD',
  soft: '#E3F0FC',
  selected: '#D3E9FC',
  disabled: '#D6E3EF',
  shadow: 'rgba(23, 78, 126, 0.14)',
};

export const F = { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, h2: 24, h1: 30 };

// ── Nút & chip tông Ghibli: GỖ → MÂY → TRỜI ────────────────────────────────
// gỗ  = hành động chính (1 nút/màn) · mây = phụ / chưa chọn · trời = đang chọn / nhấn nhẹ
// Mỗi nút có "gờ" đáy đậm hơn (lip) như tấm gỗ vẽ tay; bấm xuống thì gờ thu lại.
export const BTN = {
  wood:  { top: '#A46F45', bottom: '#83532F', lip: '#5E3A22', border: '#7A4E2E', text: '#FFF8EA' },
  cloud: { top: '#FFFDF7', bottom: '#F6EEDD', lip: '#E2D4B8', border: '#E2D4B8', text: '#5D4037' },
  sky:   { top: '#CFE6F4', bottom: '#AFD3EA', lip: '#7FAFCF', border: '#8DB8D6', text: '#1F4A66' },
  off:   { top: '#EFE8DA', bottom: '#E6DCC8', lip: '#D7CBB3', border: '#DCD0B8', text: '#A1887F' },
};

// Chip chọn lựa (lọc, chế độ…): mây khi tắt, trời khi bật
export const CHIP = {
  bg: '#FFFDF7', border: '#E2D4B8', text: '#5D4037',
  onBg: '#DCEBF5', onBorder: '#7FAFCF', onText: '#1F4A66',
};

export const shadow = (level = 1) => ({
  elevation: level * 2,
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: level },
  shadowOpacity: 1,
  shadowRadius: level * 3,
});

// ── Nền "sổ tay": giấy kem toàn màn + dải trời màu nước cắt theo sóng ────────
// Mọi màn dùng chung 2 ảnh; mỗi màn chỉ khác đoạn cắt trời, chiều lật,
// màu nhấn nhẹ và hình sóng (sinh từ seed cố định → mở lại vẫn y hệt).
export const BG = {
  home:     { tint: '#F2B34C', tintOpacity: 0.14, offset: 0.00, flip: false, seed: 1 },
  meal:     { tint: '#E7855E', tintOpacity: 0.14, offset: 0.35, flip: true,  seed: 2 },
  history:  { tint: null,      tintOpacity: 0,    offset: 0.10, flip: false, seed: 3 },
  profile:  { tint: '#8DB36F', tintOpacity: 0.14, offset: 0.22, flip: true,  seed: 4 },
  settings: { tint: null,      tintOpacity: 0,    offset: 0.50, flip: false, seed: 5 },
};
