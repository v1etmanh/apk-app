// components/MealFilterPanel.js
// Dụng cụ bếp hôm nay (ở Home). Chi phí & thời gian nấu đã chuyển sang
// thanh lọc trên danh sách kết quả (RecommendScreen → ResultFilterBar).
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { C, R, F } from '../theme';

export const TOOL_KEYS = ['pot', 'pan', 'fryer_oven', 'steamer', 'no_cook'];

export const DEFAULT_MEAL_FILTERS = { cooking_tools: [] };

/** Bỏ các field cũ (cost/time/mode) có thể còn trong setting đã lưu. */
export const sanitizeMealFilters = (raw) => ({
  cooking_tools: Array.isArray(raw?.cooking_tools) ? raw.cooking_tools.filter(k => TOOL_KEYS.includes(k)) : [],
});

export const Pill = ({ label, active, onPress, style }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    style={[s.pill, active && s.pillOn, style]}
  >
    {active && (
      <LinearGradient
        pointerEvents="none"
        colors={['#D9D18A', '#BBB263']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    )}
    <Text style={[s.pillText, active && s.pillTextOn]}>{label}</Text>
  </TouchableOpacity>
);

const MealFilterPanel = ({ value, onChange }) => {
  const { t } = useTranslation();
  const f = value || DEFAULT_MEAL_FILTERS;

  const toggleTool = (k) => {
    const tools = new Set(f.cooking_tools);
    if (tools.has(k)) tools.delete(k); else tools.add(k);
    onChange({ ...f, cooking_tools: [...tools] });
  };

  return (
    <View style={s.wrap}>
      <Text style={s.rowLabel}>{t('mealFilter.tools')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rowContent}>
        {TOOL_KEYS.map(k => (
          <Pill key={k} label={t(`mealFilter.toolOptions.${k}`)} active={f.cooking_tools.includes(k)}
            onPress={() => toggleTool(k)} />
        ))}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { marginTop: 14 },
  rowLabel: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid, marginHorizontal: 24, marginBottom: 6 },
  rowContent: { paddingHorizontal: 24, gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill,
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  pillOn: {
    backgroundColor: '#D9D18A',
    borderColor: '#938B45',
  },
  pillText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: F.sm, color: C.textMid },
  pillTextOn: { color: '#3F3A1F' },
});

export default MealFilterPanel;
