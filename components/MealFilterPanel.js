// components/MealFilterPanel.js
// Bộ lọc theo từng bữa (mỗi lần Generate): dụng cụ / cách nấu, chi phí có biên độ,
// thời gian nấu, chế độ gợi ý hoặc từ tủ lạnh.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C, R, F } from '../theme';

export const TOOL_KEYS = ['pot', 'pan', 'fryer_oven', 'steamer', 'no_cook'];
const COST_LEVELS = [1, 2, 3];
const TIME_OPTIONS = [15, 30, 45, 60];

export const DEFAULT_MEAL_FILTERS = {
  cooking_tools: [],
  cost_level: null,       // null = bất kỳ (dùng cost_preference mặc định)
  cost_tolerance: 1,
  max_cook_time: null,    // null = dùng cài đặt chung
  mode: 'suggest',
};

/** Chuyển state UI → body `meal_filters` gửi lên /api/v1/recommend. */
export const toRequestMealFilters = (f) => {
  const out = { mode: f.mode || 'suggest' };
  if (f.cooking_tools?.length) out.cooking_tools = f.cooking_tools;
  if (f.cost_level) {
    out.cost_level = f.cost_level;
    out.cost_tolerance = f.cost_tolerance ?? 1;
  }
  if (f.max_cook_time) out.max_cook_time = f.max_cook_time >= 60 ? 999 : f.max_cook_time;
  return out;
};

const Pill = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    style={[s.pill, active && s.pillOn]}
  >
    <Text style={[s.pillText, active && s.pillTextOn]}>{label}</Text>
  </TouchableOpacity>
);

const Row = ({ label, children }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowContent}>
      {children}
    </ScrollView>
  </View>
);

const MealFilterPanel = ({ value, onChange, onPickFridge }) => {
  const { t } = useTranslation();
  const f = value || DEFAULT_MEAL_FILTERS;
  const set = (patch) => onChange({ ...f, ...patch });

  const toggleTool = (k) => {
    const tools = new Set(f.cooking_tools);
    if (tools.has(k)) tools.delete(k); else tools.add(k);
    set({ cooking_tools: [...tools] });
  };

  return (
    <View style={s.wrap}>
      <Text style={s.title}>{t('mealFilter.title')}</Text>

      <Row label={t('mealFilter.mode')}>
        {['suggest', 'fridge'].map(m => (
          <Pill key={m} label={t(`mealFilter.modes.${m}`)} active={f.mode === m}
            onPress={() => {
              set({ mode: m });
              if (m === 'fridge') onPickFridge?.();
            }} />
        ))}
      </Row>

      <Row label={t('mealFilter.tools')}>
        {TOOL_KEYS.map(k => (
          <Pill key={k} label={t(`mealFilter.toolOptions.${k}`)} active={f.cooking_tools.includes(k)}
            onPress={() => toggleTool(k)} />
        ))}
      </Row>

      <Row label={t('mealFilter.cost')}>
        <Pill label={t('mealFilter.any')} active={!f.cost_level} onPress={() => set({ cost_level: null })} />
        {COST_LEVELS.map(c => (
          <Pill key={c} label={t(`mealFilter.costOptions.${c}`)} active={f.cost_level === c}
            onPress={() => set({ cost_level: c })} />
        ))}
        {!!f.cost_level && (
          <Pill label={t('mealFilter.tolerance')} active={f.cost_tolerance >= 1}
            onPress={() => set({ cost_tolerance: f.cost_tolerance >= 1 ? 0 : 1 })} />
        )}
      </Row>

      <Row label={t('mealFilter.time')}>
        <Pill label={t('mealFilter.any')} active={!f.max_cook_time} onPress={() => set({ max_cook_time: null })} />
        {TIME_OPTIONS.map(m => (
          <Pill key={m} label={t(`mealFilter.timeOptions.${m}`)} active={f.max_cook_time === m}
            onPress={() => set({ max_cook_time: m })} />
        ))}
      </Row>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  title: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 12, color: C.textLight, letterSpacing: 1.2,
    textTransform: 'uppercase', marginHorizontal: 24, marginBottom: 8,
  },
  row: { marginBottom: 10 },
  rowLabel: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid, marginHorizontal: 24, marginBottom: 6 },
  rowContent: { paddingHorizontal: 24, gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: C.border,
  },
  pillOn: { backgroundColor: C.primary, borderColor: C.woodDark },
  pillText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid },
  pillTextOn: { color: '#fff' },
});

export default MealFilterPanel;
