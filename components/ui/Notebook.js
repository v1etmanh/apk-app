// components/ui/Notebook.js
// Mảnh ghép nhỏ dùng chung cho phong cách "sổ tay bếp": nút tròn, chip, dấu tick chọn.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, OCEAN } from '../../theme';

/** Nút tròn 44px trên header (quay lại, lọc, làm mới…). */
export const CircleButton = ({ icon = 'chevron-back', onPress, label, style, tone, color = tone === 'ocean' ? OCEAN.dark : C.textMid }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[s.circle, tone === 'ocean' && s.oceanSurface, style]}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
  >
    <Ionicons name={icon} size={20} color={color} />
  </TouchableOpacity>
);

const PILL_TONES = {
  ocean:   { bg: OCEAN.soft, fg: OCEAN.dark },
  oceanOutline: { bg: OCEAN.tint, fg: OCEAN.muted, border: OCEAN.border },
  neutral: { bg: C.chipBg,          fg: C.textMid },
  outline: { bg: C.parchmentLight,  fg: C.textMid, border: C.border },
  fresh:   { bg: C.freshBg,         fg: C.freshText },
  season:  { bg: C.seasonBg,        fg: C.seasonText },
};

/** Chip nhỏ chỉ để hiển thị. tone: neutral | outline | fresh | season | ocean | oceanOutline */
export const Pill = ({ label, tone = 'neutral', style, textStyle }) => {
  const t = PILL_TONES[tone] || PILL_TONES.neutral;
  return (
    <View style={[s.pill, { backgroundColor: t.bg }, t.border && { borderWidth: 1, borderColor: t.border }, style]}>
      <Text style={[s.pillText, { color: t.fg }, textStyle]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

/** Dấu tick tròn: màu nhấn khi chọn, viền rỗng khi chưa. */
export const CheckDot = ({ on, size = 22, square = false, tone }) => (
  <View
    style={[
      s.check,
      { width: size, height: size, borderRadius: square ? 7 : size / 2 },
      on && s.checkOn,
      tone === 'ocean' && { borderColor: on ? OCEAN.primary : OCEAN.border, backgroundColor: on ? OCEAN.primary : OCEAN.tint },
    ]}
  >
    {on && <Ionicons name="checkmark" size={Math.round(size * 0.6)} color="#fff" />}
  </View>
);

/** Ghi chú nét đứt (lý do, cảnh báo nhẹ). */
export const DashedNote = ({ children, style, tone = 'paper' }) => (
  <View style={[s.note, tone === 'warm' && s.noteWarm, tone === 'ocean' && s.oceanSurface, style]}>{children}</View>
);

const s = StyleSheet.create({
  oceanSurface: { backgroundColor: OCEAN.tint, borderColor: OCEAN.border },
  circle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.parchmentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 11.5, fontFamily: 'BeVietnamPro-SemiBold' },
  check: {
    borderWidth: 2, borderColor: '#C9B9A8',
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  note: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.paperStroke,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: 'rgba(255,248,234,0.75)',
  },
  noteWarm: { backgroundColor: 'rgba(253,235,200,0.6)' },
});
