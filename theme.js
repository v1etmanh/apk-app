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
  textLight:    '#8D6E63',   // Light brown hint/placeholder

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

export const F = { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, h2: 24, h1: 30 };

export const shadow = (level = 1) => ({
  elevation: level * 2,
  shadowColor: C.shadow,
  shadowOffset: { width: 0, height: level },
  shadowOpacity: 1,
  shadowRadius: level * 3,
});
