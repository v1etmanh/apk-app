// components/onboarding/ChoiceCard.js — thẻ chọn (giới tính, vùng miền, chế độ ăn) + chip
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { C, R, F, shadow } from '../../theme';

export const ChoiceCard = ({ emoji, label, description, selected, onPress, compact, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="radio"
    accessibilityState={{ selected: !!selected }}
    style={[s.card, compact && s.cardCompact, selected && s.cardOn, style]}
  >
    <Text style={[s.emoji, compact && s.emojiCompact]}>{emoji}</Text>
    <View style={{ flex: compact ? 0 : 1 }}>
      <Text style={[s.label, selected && s.labelOn, compact && { textAlign: 'center' }]}>{label}</Text>
      {!!description && <Text style={s.desc}>{description}</Text>}
    </View>
    {!compact && <View style={[s.radio, selected && s.radioOn]}>{selected && <View style={s.radioDot} />}</View>}
  </TouchableOpacity>
);

export const Chip = ({ emoji, label, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: !!selected }}
    style={[s.chip, selected && s.chipOn]}
  >
    {!!emoji && <Text style={s.chipEmoji}>{emoji}</Text>}
    <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
  </TouchableOpacity>
);

export const SectionLabel = ({ children }) => <Text style={s.section}>{children}</Text>;

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: C.borderLight, ...shadow(1),
  },
  cardCompact: { flex: 1, flexDirection: 'column', gap: 6, paddingVertical: 20, marginBottom: 0 },
  cardOn: { borderColor: C.primary, backgroundColor: C.parchmentLight },
  emoji: { fontSize: 28 },
  emojiCompact: { fontSize: 40 },
  label: { fontSize: F.lg, color: C.text, fontFamily: 'BeVietnamPro-SemiBold' },
  labelOn: { color: C.woodDark, fontFamily: 'BeVietnamPro-Bold' },
  desc: { fontSize: F.sm, color: C.textLight, fontFamily: 'BeVietnamPro-Regular', marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.primary },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: R.pill,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: F.base, color: C.textMid, fontFamily: 'BeVietnamPro-SemiBold' },
  chipTextOn: { color: '#fff' },
  section: {
    fontSize: F.sm, color: C.textLight, fontFamily: 'BeVietnamPro-Bold',
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 10,
  },
});
