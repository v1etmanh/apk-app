// Daily Mate — Design System
// Phong cách: tươi mát, gần gũi, hiện đại — phù hợp người Việt

export const C = {
  // Brand
  primary:      '#38B07A',   // xanh lá tươi — brand chính
  primaryLight: '#E7F5EE',
  primaryDark:  '#25875C',
  primaryMid:   '#2E9A6A',

  // Weather / cool
  teal:         '#1AA8C0',
  tealLight:    '#DFF4F8',

  // Food / warm
  orange:       '#FF7640',
  orangeLight:  '#FFF1EB',
  amber:        '#F5A623',
  amberLight:   '#FFF7E6',

  // Surfaces
  bg:           '#F2F4F1',   // nền trang — trắng sage
  surface:      '#FFFFFF',
  surfaceAlt:   '#F8FAF7',

  // Text
  text:         '#1A291A',   // chính
  textMid:      '#4E6350',   // phụ
  textLight:    '#8EA08E',   // hint / placeholder

  // Borders
  border:       '#DEE8DE',
  borderLight:  '#EEF4EE',

  // Status
  success:      '#2ECC71',
  danger:       '#FF3B30',
  warning:      '#F5A623',
  info:         '#007AFF',

  // Shadow
  shadow:       'rgba(20, 60, 30, 0.09)',
};

export const R = { sm: 8, md: 12, lg: 16, xl: 20, pill: 28, circle: 999 };

export const F = { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, h2: 24, h1: 30 };

export const shadow = (level = 1) => ({
  elevation: level * 2,
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: level },
  shadowOpacity: 1,
  shadowRadius: level * 3,
});
