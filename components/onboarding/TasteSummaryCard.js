// components/onboarding/TasteSummaryCard.js — thanh % khẩu vị + chế độ chỉnh tay
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { C, R, F, shadow } from '../../theme';
import { TASTE_KEYS } from '../../utils/tasteMath';

export const TASTE_COLOR = {
  sweet: '#F59E0B', sour: '#38B07A', salty: '#3498DB', bitter: '#8E7CC3',
  umami: '#E67E22', spicy: '#E74C3C', astringent: '#6AB187',
};
export const TASTE_EMOJI = {
  sweet: '🍬', sour: '🍋', salty: '🧂', bitter: '☕', umami: '🍜', spicy: '🌶️', astringent: '🍵',
};

// 3 vị nổi bật tô gỗ đậm, các vị còn lại màu giấy nhạt — như thước đo trong sổ tay.
const Bar = ({ k, value, label, top }) => (
  <View style={s.row}>
    <Text style={[s.rowLabel, top && s.rowLabelTop]}>{TASTE_EMOJI[k]} {label}</Text>
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: top ? C.primary : C.paperStroke }]} />
    </View>
    <Text style={[s.pct, !top && { fontFamily: 'BeVietnamPro-Regular', color: C.textMid }]}>{Math.round(value * 100)}%</Text>
  </View>
);

const TasteSummaryCard = ({ taste, labels, editable, onChange, headline }) => {
  const keys = editable ? TASTE_KEYS : [...TASTE_KEYS].sort((a, b) => taste[b] - taste[a]);
  return (
    <View style={s.card}>
      {!!headline && <Text style={s.headline}>{headline}</Text>}
      {keys.map(k => (
        editable ? (
          <View key={k} style={s.editRow}>
            <View style={s.editHead}>
              <Text style={s.rowLabel}>{TASTE_EMOJI[k]} {labels[k]}</Text>
              <Text style={s.pct}>{Math.round((taste[k] ?? 0) * 100)}%</Text>
            </View>
            <Slider
              minimumValue={0.05}
              maximumValue={0.95}
              step={0.05}
              value={taste[k] ?? 0.5}
              onSlidingComplete={(v) => onChange?.({ ...taste, [k]: Math.round(v * 100) / 100 })}
              minimumTrackTintColor={TASTE_COLOR[k]}
              maximumTrackTintColor={C.parchmentDark}
              thumbTintColor={TASTE_COLOR[k]}
            />
          </View>
        ) : (
          <Bar key={k} k={k} value={taste[k] ?? 0} label={labels[k]} top={keys.indexOf(k) < 3} />
        )
      ))}
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: C.parchmentLight, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: C.paperStroke, ...shadow(1),
  },
  headline: { fontSize: F.base, color: C.woodDark, fontFamily: 'BeVietnamPro-Bold', marginBottom: 12, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowLabel: { width: 116, fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular' },
  rowLabelTop: { color: C.text, fontFamily: 'BeVietnamPro-Bold' },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: C.parchmentDark, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  pct: { width: 44, textAlign: 'right', fontSize: F.sm, color: C.text, fontFamily: 'BeVietnamPro-Bold' },
  editRow: { marginBottom: 6 },
  editHead: { flexDirection: 'row', justifyContent: 'space-between' },
});

export default TasteSummaryCard;
