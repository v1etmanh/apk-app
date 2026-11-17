// components/onboarding/ChoiceCard.js — thẻ chọn (giới tính, vùng miền, chế độ ăn) + chip
// Đã chọn: viền gỗ 2px + nền giấy sáng + dấu tick tròn nâu.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { C, R, F, shadow } from '../../theme';
import { CheckDot } from '../ui/Notebook';

export const ChoiceCard = ({ emoji, label, description, selected, onPress, compact, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="radio"
    accessibilityState={{ selected: !!selected }}
    style={[s.card, compact && s.cardCompact, selected && s.cardOn, style]}
  >
    {compact
      ? <Text style={s.emojiCompact}>{emoji}</Text>
      : <View style={s.emojiTile}><Text style={s.emoji}>{emoji}</Text></View>}
    <View style={{ flex: compact ? 0 : 1 }}>
      <Text style={[s.label, compact && { textAlign: 'center' }]}>{label}</Text>
      {!!description && <Text style={s.desc}>{description}</Text>}
    </View>
    {!compact && <CheckDot on={selected} size={24} />}
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
    borderWidth: 1.5, borderColor: C.border,
  },
  cardCompact: { flex: 1, flexDirection: 'column', gap: 6, paddingVertical: 16, marginBottom: 0, justifyContent: 'center' },
  cardOn: { borderWidth: 2, borderColor: C.primary, backgroundColor: C.parchmentLight, ...shadow(2) },
  emojiTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.chipBg, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  emojiCompact: { fontSize: 34 },
  label: { fontSize: F.base + 1, color: C.text, fontFamily: 'Lora-Bold' },
  desc: { fontSize: 12.5, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', marginTop: 2, lineHeight: 18 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1.5, borderColor: C.border,
  },
  chipOn: { backgroundColor: C.parchmentLight, borderWidth: 2, borderColor: C.primary },
  chipEmoji: { fontSize: 18 },
  chipText: { fontSize: F.sm + 1, color: C.text, fontFamily: 'BeVietnamPro-SemiBold' },
  chipTextOn: { fontFamily: 'BeVietnamPro-Bold', color: C.woodDark },
  section: {
    fontSize: F.sm + 1, color: C.text, fontFamily: 'BeVietnamPro-Bold',
    marginTop: 8, marginBottom: 10,
  },
});
