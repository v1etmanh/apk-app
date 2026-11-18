// components/ResultFilterBar.js
// Thanh lọc trên danh sách kết quả: nguyên liệu đã chọn (✎), khoảng giá / phần (± 1 mức), thời gian nấu.
// Số món của từng lựa chọn lấy từ `filter_counts` mà /api/v1/recommend trả về ở trang 1.
// Nhãn khoảng giá lấy từ `price_bands` của server (cost_level 1..3 ↔ VND / 1 phần ăn).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { C, R, F, shadow } from '../theme';
import { priceBandLabel, sanitizePriceBands, formatVnd } from '../utils/price';

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

const shortBandLabel = (band, lang) => {
  if (!band) return '';
  const min = formatVnd(band.min, lang);
  const max = formatVnd(band.max, lang);
  if (!min && max) return `< ${max}`;
  if (min && !max) return `> ${min}`;
  return `${min.replace(/k$/, '')}–${max}`;
};

/** Thanh chia đều: mỗi ô một lựa chọn, ô đang chọn nổi lên nền giấy trắng. */
const Segmented = ({ options, selected, onSelect, t }) => (
  <View style={s.seg} accessibilityRole="radiogroup">
    {options.map(o => {
      const on = o.key === selected;
      return (
        <TouchableOpacity
          key={String(o.key)}
          onPress={() => onSelect(o.key)}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: on }}
          accessibilityLabel={o.a11y || o.label}
          style={[s.segItem, on && s.segItemOn]}
        >
          <Text style={[s.segText, on && s.segTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {o.label}
          </Text>
          {o.count != null && (
            <Text style={[s.segCount, on && s.segCountOn]} numberOfLines={1}>
              {t('resultFilters.countShort', { count: o.count })}
            </Text>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
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

  const costOptions = [
    { key: null, label: t('resultFilters.any') },
    ...COSTS.map(c => ({
      key: c,
      label: shortBandLabel(bands[c - 1], lang),
      a11y: priceBandLabel(bands[c - 1], t, lang),
      count: counts?.cost?.[String(c)],
    })),
  ];
  const timeOptions = [
    { key: null, label: t('resultFilters.any') },
    ...TIMES.map(m => ({
      key: m,
      label: t(`resultFilters.timeShort.${m}`),
      a11y: t(`resultFilters.time.${m}`),
      count: m === 60 ? null : counts?.time?.[String(m)],
    })),
  ];
  const tolOn = f.cost_tolerance === 1;

  return (
    <View style={s.wrap}>
      {pickedLabel && (
        <TouchableOpacity onPress={onEditPicked} activeOpacity={0.8} accessibilityRole="button" style={s.picked}>
          <Ionicons name="leaf-outline" size={14} color={C.primary} />
          <Text style={s.pickedText} numberOfLines={1}>{pickedLabel}</Text>
          <Ionicons name="create-outline" size={15} color={C.primary} />
        </TouchableOpacity>
      )}

      <View style={s.labelRow}>
        <View style={s.label}>
          <Ionicons name="cash-outline" size={14} color={C.primary} />
          <Text style={s.labelText}>{t('resultFilters.priceTitle')}</Text>
        </View>
        {!!f.cost_level && (
          <TouchableOpacity
            onPress={() => set({ cost_tolerance: tolOn ? 0 : 1 })}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tolOn }}
            style={s.tol}
          >
            <Ionicons name={tolOn ? 'checkbox' : 'square-outline'} size={15} color={C.primary} />
            <Text style={s.tolText}>{t('resultFilters.tolerance')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Segmented t={t} options={costOptions} selected={f.cost_level} onSelect={k => set({ cost_level: k })} />

      <View style={s.labelRow}>
        <View style={s.label}>
          <Ionicons name="time-outline" size={14} color={C.primary} />
          <Text style={s.labelText}>{t('resultFilters.timeTitle')}</Text>
        </View>
      </View>
      <Segmented t={t} options={timeOptions} selected={f.max_cook_time} onSelect={k => set({ max_cook_time: k })} />
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  picked: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, marginBottom: 8,
    backgroundColor: C.parchmentLight, borderWidth: 1.5, borderColor: C.primary,
  },
  pickedText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid, flexShrink: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, minHeight: 20 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  labelText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12, color: C.textSoft },
  tol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tolText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: C.textSoft },
  seg: {
    flexDirection: 'row', backgroundColor: C.chipBg, borderRadius: R.md, padding: 3, marginBottom: 8,
  },
  segItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38,
    paddingHorizontal: 2, paddingVertical: 4, borderRadius: 9, borderWidth: 1, borderColor: 'transparent',
  },
  segItemOn: { backgroundColor: C.surface, borderColor: C.paperStroke, ...shadow(1) },
  segText: { fontFamily: 'BeVietnamPro-Regular', fontSize: F.sm, color: C.textMid },
  segTextOn: { fontFamily: 'BeVietnamPro-SemiBold', color: C.text },
  segCount: { fontFamily: 'BeVietnamPro-Regular', fontSize: F.xs, color: C.textSoft, marginTop: 1 },
  segCountOn: { color: C.primary },
});

export default ResultFilterBar;
