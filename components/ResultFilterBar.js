// components/ResultFilterBar.js
// Thanh lọc trên danh sách kết quả: nguyên liệu đã chọn (✎), khoảng giá / phần (± 1 mức), thời gian nấu.
// Số món của từng lựa chọn lấy từ `filter_counts` mà /api/v1/recommend trả về ở trang 1.
// Nhãn khoảng giá lấy từ `price_bands` của server (cost_level 1..3 ↔ VND / 1 phần ăn).
// Chỉnh xong cả giá + thời gian rồi bấm "Áp dụng" mới lọc (bản nháp `draft`).
// `collapsed`: thu gọn thành 1 dòng tóm tắt — bấm để mở lại (RecommendScreen thu khi cuộn xuống).
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { C, R, F, BTN, shadow } from '../theme';
import { priceBandLabel, sanitizePriceBands, formatVnd } from '../utils/price';
import WoodButton from './ui/WoodButton';

export const DEFAULT_RESULT_FILTERS = { cost_level: null, cost_tolerance: 0, max_cook_time: null };
const COSTS = [1, 2, 3];
const TIMES = [15, 30, 45, 60];
const FILTER_TONES = {
  price: { selected: BTN.wood.bottom, text: C.textMid, selectedText: BTN.wood.text, shadow: C.shadow },
  time: { selected: BTN.wood.bottom, text: C.textMid, selectedText: BTN.wood.text, shadow: C.shadow },
};

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

/** Nền trắng; ô đang chọn cùng tông gỗ với nút "Áp dụng" (BTN.wood). */
const Segmented = ({ options, selected, onSelect, t, palette }) => (
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
          style={[s.segItem, on && s.segItemOn, on && { backgroundColor: palette.selected, borderColor: palette.selected, shadowColor: palette.shadow }]}
        >
          <Text style={[s.segText, on && s.segTextOn, { color: on ? palette.selectedText : palette.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {o.label}
          </Text>
          {o.count != null && (
            <Text style={[s.segCount, { color: on ? palette.selectedText : palette.text }]} numberOfLines={1}>
              {t('resultFilters.countShort', { count: o.count })}
            </Text>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

const sameFilters = (a, b) =>
  a.cost_level === b.cost_level && a.cost_tolerance === b.cost_tolerance && a.max_cook_time === b.max_cook_time;

const ResultFilterBar = ({ value, onChange, counts, priceBands, picked = [], onEditPicked, collapsed = false, onToggle }) => {
  const { t, i18n } = useTranslation();
  const applied = value || DEFAULT_RESULT_FILTERS;
  const [draft, setDraft] = useState(applied);
  // Bộ lọc đã áp dụng đổi từ ngoài (nạp lại lần trước) → đồng bộ bản nháp
  useEffect(() => { setDraft(applied); }, [applied.cost_level, applied.cost_tolerance, applied.max_cook_time]);
  const f = draft;
  const dirty = !sameFilters(draft, applied);
  const bands = sanitizePriceBands(priceBands);
  const lang = (i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi';
  const set = (patch) => setDraft(prev => ({ ...prev, ...patch }));
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

  // Dòng tóm tắt khi thu gọn: "50–100k · 30 phút" hoặc "Tất cả món"
  const summaryParts = [
    applied.cost_level ? shortBandLabel(bands[applied.cost_level - 1], lang) : null,
    applied.max_cook_time ? t(`resultFilters.timeShort.${applied.max_cook_time}`) : null,
  ].filter(Boolean);
  const summary = summaryParts.length ? summaryParts.join(' · ') : t('resultFilters.summaryAny');

  if (collapsed) {
    return (
      <TouchableOpacity
        style={s.collapsed}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${t('resultFilters.show')}: ${summary}`}
      >
        <Ionicons name="options-outline" size={16} color={BTN.wood.bottom} />
        <Text style={s.collapsedText} numberOfLines={1}>
          <Text style={s.collapsedLabel}>{t('resultFilters.show')}  </Text>
          {pickedLabel ? `${pickedLabel} · ` : ''}{summary}
        </Text>
        {dirty && <View style={s.dirtyDot} />}
        <Ionicons name="chevron-down" size={16} color={C.textSoft} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.wrap}>
      {pickedLabel && (
        <TouchableOpacity onPress={onEditPicked} activeOpacity={0.8} accessibilityRole="button" style={s.picked}>
          <Ionicons name="leaf-outline" size={14} color={BTN.wood.bottom} />
          <Text style={s.pickedText} numberOfLines={1}>{pickedLabel}</Text>
          <Ionicons name="create-outline" size={15} color={BTN.wood.bottom} />
        </TouchableOpacity>
      )}

      <View style={s.labelRow}>
        <View style={s.label}>
          <Ionicons name="cash-outline" size={14} color={BTN.wood.bottom} />
          <Text style={[s.labelText, { color: C.textSoft }]}>{t('resultFilters.priceTitle')}</Text>
        </View>
        {!!f.cost_level && (
          <TouchableOpacity
            onPress={() => set({ cost_tolerance: tolOn ? 0 : 1 })}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tolOn }}
            style={s.tol}
          >
            <Ionicons name={tolOn ? 'checkbox' : 'square-outline'} size={15} color={BTN.wood.bottom} />
            <Text style={s.tolText}>{t('resultFilters.tolerance')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Segmented palette={FILTER_TONES.price} t={t} options={costOptions} selected={f.cost_level} onSelect={k => set({ cost_level: k })} />

      <View style={s.labelRow}>
        <View style={s.label}>
          <Ionicons name="time-outline" size={14} color={BTN.wood.bottom} />
          <Text style={s.labelText}>{t('resultFilters.timeTitle')}</Text>
        </View>
      </View>
      <Segmented palette={FILTER_TONES.time} t={t} options={timeOptions} selected={f.max_cook_time} onSelect={k => set({ max_cook_time: k })} />

      <View style={s.actions}>
        {dirty ? (
          <>
            <TouchableOpacity onPress={() => setDraft(applied)} hitSlop={8} style={s.linkBtn} accessibilityRole="button">
              <Text style={s.linkText}>{t('resultFilters.discard')}</Text>
            </TouchableOpacity>
            <WoodButton size="sm" title={t('resultFilters.apply')} onPress={() => onChange(draft)} style={s.applyBtn} />
          </>
        ) : onToggle ? (
          <TouchableOpacity onPress={onToggle} hitSlop={8} style={s.linkBtn} accessibilityRole="button">
            <Text style={s.linkText}>{t('resultFilters.hide')}</Text>
            <Ionicons name="chevron-up" size={14} color={C.textSoft} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  picked: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.pill, marginBottom: 8,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: BTN.wood.bottom,
  },
  pickedText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid, flexShrink: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, minHeight: 20 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  labelText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12, color: C.textSoft },
  tol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tolText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: C.textSoft },
  seg: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, padding: 3, marginBottom: 8,
  },
  segItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44,
    paddingHorizontal: 2, paddingVertical: 4, borderRadius: 9, borderWidth: 1, borderColor: 'transparent',
  },
  segItemOn: { ...shadow(1) },
  segText: { fontFamily: 'BeVietnamPro-Regular', fontSize: F.sm },
  segTextOn: { fontFamily: 'BeVietnamPro-SemiBold' },
  segCount: { fontFamily: 'BeVietnamPro-Regular', fontSize: F.xs, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, minHeight: 28 },
  applyBtn: { minWidth: 120 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  linkText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12.5, color: C.textSoft, textDecorationLine: 'underline' },
  collapsed: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44,
    marginHorizontal: 16, marginVertical: 6, paddingHorizontal: 14, borderRadius: R.pill,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow(1),
  },
  collapsedText: { flex: 1, fontFamily: 'BeVietnamPro-Regular', fontSize: F.sm, color: C.textMid },
  collapsedLabel: { fontFamily: 'BeVietnamPro-Bold', color: C.text },
  dirtyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber },
});

export default ResultFilterBar;
