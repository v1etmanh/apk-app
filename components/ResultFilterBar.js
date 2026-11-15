// components/ResultFilterBar.js
// Thanh lọc trên danh sách kết quả: nguyên liệu đã chọn (✎), khoảng giá / phần (± 1 mức), thời gian nấu.
// Số món của từng lựa chọn lấy từ `filter_counts` mà /api/v1/recommend trả về ở trang 1.
// Nhãn khoảng giá lấy từ `price_bands` của server (cost_level 1..3 ↔ VND / 1 phần ăn).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C, R, F } from '../theme';
import { priceBandLabel, sanitizePriceBands } from '../utils/price';

export const DEFAULT_RESULT_FILTERS = { cost_level: null, cost_tolerance: 0, max_cook_time: null };
const COSTS = [1, 2, 3];
const TIMES = [15, 30, 45, 60];

export const sanitizeResultFilters = (raw) => ({
  cost_level: COSTS.includes(raw?.cost_level) ? raw.cost_level : null,
  cost_tolerance: raw?.cost_tolerance === 1 ? 1 : 0,
  max_cook_time: TIMES.includes(raw?.max_cook_time) ? raw.max_cook_time : null,
});

/** Gộp bộ lọc kết quả vào meal_filters của request. 60 = "60+" = không giới hạn. */
export const applyResultFilters = (mealFilters = {}, f = DEFAULT_RESULT_FILTERS) => {
  const out = { ...mealFilters };
  delete out.cost_level; delete out.cost_tolerance; delete out.max_cook_time;
  if (f.cost_level) {
    out.cost_level = f.cost_level;
    out.cost_tolerance = f.cost_tolerance;
  }
  if (f.max_cook_time) out.max_cook_time = f.max_cook_time >= 60 ? 999 : f.max_cook_time;
  return out;
};

const Chip = ({ label, count, active, onPress, accent }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    style={[s.chip, active && s.chipOn, accent && s.chipAccent]}
  >
    <Text style={[s.chipText, active && s.chipTextOn]} numberOfLines={1}>
      {label}{count != null ? <Text style={[s.count, active && s.chipTextOn]}>  {count}</Text> : null}
    </Text>
  </TouchableOpacity>
);

const ResultFilterBar = ({ value, onChange, counts, priceBands, picked = [], onEditPicked }) => {
  const { t, i18n } = useTranslation();
  const f = value || DEFAULT_RESULT_FILTERS;
  const bands = sanitizePriceBands(priceBands);
  const lang = (i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi';
  const set = (patch) => onChange({ ...f, ...patch });
  const pickedLabel = picked.length
    ? picked.slice(0, 3).map(p => p.name).join(', ') + (picked.length > 3 ? ` +${picked.length - 3}` : '')
    : null;

  return (
    <View style={s.wrap}>
      {pickedLabel && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          <Chip accent label={`🥬 ${pickedLabel}  ✎`} onPress={onEditPicked} />
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        <Text style={s.rowLabel}>💰</Text>
        <Chip label={t('resultFilters.any')} active={!f.cost_level} onPress={() => set({ cost_level: null })} />
        {COSTS.map(c => (
          <Chip key={c} label={priceBandLabel(bands[c - 1], t, lang)} count={counts?.cost?.[String(c)]}
            active={f.cost_level === c} onPress={() => set({ cost_level: c })} />
        ))}
        {!!f.cost_level && (
          <Chip label={t('resultFilters.tolerance')} active={f.cost_tolerance === 1}
            onPress={() => set({ cost_tolerance: f.cost_tolerance === 1 ? 0 : 1 })} />
        )}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        <Text style={s.rowLabel}>⏱</Text>
        <Chip label={t('resultFilters.any')} active={!f.max_cook_time} onPress={() => set({ max_cook_time: null })} />
        {TIMES.map(m => (
          <Chip key={m} label={t(`resultFilters.time.${m}`)} count={m === 60 ? null : counts?.time?.[String(m)]}
            active={f.max_cook_time === m} onPress={() => set({ max_cook_time: m })} />
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { paddingTop: 6, paddingBottom: 4, gap: 6 },
  row: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  rowLabel: { fontSize: 15, marginRight: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: C.border,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.woodDark },
  chipAccent: { backgroundColor: '#FFF8EA', borderColor: C.primary, borderWidth: 1.5 },
  chipText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid, maxWidth: 260 },
  chipTextOn: { color: '#fff' },
  count: { fontFamily: 'BeVietnamPro-Regular', fontSize: 11, color: C.textLight },
});

export default ResultFilterBar;
