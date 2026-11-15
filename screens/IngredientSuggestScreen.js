// screens/IngredientSuggestScreen.js
// Bước 1 của "Gợi ý cho tôi": server gợi ý nguyên liệu hợp thời tiết, sức khỏe, khẩu vị
// → user chọn (tick sẵn 1 đạm + 2 rau) → Recommend với các nguyên liệu đó.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { withIngredients } from '../utils/searchParams';
import { C, R, F, shadow } from '../theme';

const SECTION_META = { protein: '🍗', vegetable: '🥬' };
const SEARCH_CATEGORIES = new Set(['Thịt', 'Hải sản', 'Đậu & Hạt', 'Rau củ', 'Đã chế biến', 'Sữa & Trứng']);
const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const IngredientCard = ({ item, selected, onPress, dishesLabel }) => (
  <TouchableOpacity
    style={[st.card, selected && st.cardOn]}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
  >
    <View style={st.cardHead}>
      <Text style={[st.cardName, selected && st.cardNameOn]} numberOfLines={1}>{item.name}</Text>
      <View style={[st.check, selected && st.checkOn]}>
        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </View>
    <View style={st.reasonRow}>
      {(item.reasons || []).map(r => (
        <Text key={r.key} style={st.reason}>{r.label}</Text>
      ))}
    </View>
    <Text style={st.dishCount}>{dishesLabel}</Text>
  </TouchableOpacity>
);

const IngredientSuggestScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const baseParams = route?.params?.baseParams || {};
  const allIngredients = useAppStore(s => s.allIngredients);
  const allergyKeys = useAppStore(s => s.allergies);

  const [sections, setSections] = useState([]);
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(new Map()); // id → name
  const [excludeIds, setExcludeIds] = useState([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async (exclude = [], preselect = true) => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.post('/api/v1/suggest-ingredients', { ...baseParams, exclude_ids: exclude });
      const secs = res.data?.sections || [];
      setSections(secs);
      setDemand(res.data?.demand_snapshot || null);
      if (preselect) {
        const next = new Map();
        secs.forEach(sec => sec.items.forEach(i => { if (i.preselect) next.set(i.id, i.name); }));
        setSelected(next);
      }
    } catch (e) {
      if (__DEV__) console.warn('[IngredientSuggest] load failed:', e?.message);
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load([], true); }, [load]);

  const toggle = (item) => setSelected(prev => {
    const next = new Map(prev);
    if (next.has(item.id)) next.delete(item.id); else next.set(item.id, item.name);
    return next;
  });

  // "Gợi ý khác": loại các nguyên liệu đang hiện mà chưa chọn, giữ nguyên lựa chọn
  const refresh = () => {
    const shown = sections.flatMap(sec => sec.items.map(i => i.id)).filter(id => !selected.has(id));
    const nextExclude = [...new Set([...excludeIds, ...shown])];
    setExcludeIds(nextExclude);
    load(nextExclude, false);
  };

  const shownIds = useMemo(() => new Set(sections.flatMap(sec => sec.items.map(i => i.id))), [sections]);
  const extraSelected = [...selected.entries()].filter(([id]) => !shownIds.has(id));

  const searchResults = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return [];
    return allIngredients
      .filter(i => SEARCH_CATEGORIES.has(i.category) && normalize(i.name).includes(q))
      .slice(0, 8);
  }, [query, allIngredients]);

  // Tên các nhóm dị ứng đang lưu (bỏ id nguyên liệu cụ thể) — để giải thích vì sao thiếu đạm
  const allergyNames = (allergyKeys || [])
    .filter(k => isNaN(Number(k)))
    .map(k => t(`onboarding.allergies.${k}`, { defaultValue: t(`allergy.categories.${k}`, { defaultValue: k }) }))
    .join(', ');

  const temp = baseParams?.weather?.temperature;
  const intro = !demand
    ? ''
    : (demand.cooling_food_need ?? 0) >= 0.4
      ? t('ingredientSuggest.introHot', { temp: temp != null ? Math.round(temp) : '–' })
      : (demand.warming_food_need ?? 0) >= 0.4
        ? t('ingredientSuggest.introCold', { temp: temp != null ? Math.round(temp) : '–' })
        : t('ingredientSuggest.introMild');

  const goRecommend = (ids) => {
    const picked = ids.map(id => ({ id, name: selected.get(id) }));
    navigation.navigate('Recommend', {
      searchParams: withIngredients(baseParams, ids, 'suggest'),
      pickedIngredients: picked,
      pickMode: 'suggest',
      baseParams,
    });
  };

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={st.headerSide}>
          <Text style={st.back}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={st.headerTitle}>{t('ingredientSuggest.title')}</Text>
        <View style={st.headerSide} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {!!intro && <Text style={st.intro}>{intro}</Text>}
        <Text style={st.hint}>{t('ingredientSuggest.hint')}</Text>

        {loading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.muted}>{t('ingredientSuggest.loading')}</Text>
          </View>
        ) : error ? (
          <View style={st.center}>
            <Text style={{ fontSize: 36 }}>📡</Text>
            <Text style={st.muted}>{t('ingredientSuggest.error')}</Text>
            <TouchableOpacity onPress={() => load(excludeIds, selected.size === 0)} style={st.retry}>
              <Text style={st.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {sections.map(sec => (
              <View key={sec.key} style={{ marginBottom: 18 }}>
                <Text style={st.sectionTitle}>{SECTION_META[sec.key]} {t(`ingredientSuggest.sections.${sec.key}`)}</Text>
                {!!sec.empty_reason && (
                  <View style={st.reasonBox}>
                    <Text style={st.reasonText}>
                      {t(`ingredientSuggest.why.${sec.empty_reason}`, {
                        group: t(`ingredientSuggest.sections.${sec.key}`).toLowerCase(),
                        list: allergyNames,
                        count: sec.excluded?.[sec.empty_reason] ?? 0,
                      })}
                    </Text>
                    {sec.empty_reason === 'allergy' && (
                      <TouchableOpacity onPress={() => navigation.navigate('Allergy')} hitSlop={8}>
                        <Text style={st.reasonLink}>{t('ingredientSuggest.why.editAllergy')} ›</Text>
                      </TouchableOpacity>
                    )}
                    {sec.empty_reason === 'diet' && (
                      <TouchableOpacity onPress={() => navigation.navigate('EditPersonal')} hitSlop={8}>
                        <Text style={st.reasonLink}>{t('ingredientSuggest.why.editDiet')} ›</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {sec.items.length === 0 ? (
                  <Text style={st.muted}>{t('ingredientSuggest.emptySection')}</Text>
                ) : (
                  <View style={st.grid}>
                    {sec.items.map(item => (
                      <IngredientCard
                        key={item.id}
                        item={item}
                        selected={selected.has(item.id)}
                        onPress={() => toggle(item)}
                        dishesLabel={t('ingredientSuggest.dishCount', { count: item.dish_count })}
                      />
                    ))}
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity onPress={refresh} style={st.refresh} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={C.primary} />
              <Text style={st.refreshText}>{t('ingredientSuggest.refresh')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Thêm nguyên liệu khác */}
        <Text style={st.sectionTitle}>🔍 {t('ingredientSuggest.addOther')}</Text>
        <TextInput
          style={st.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('ingredientSuggest.searchPlaceholder')}
          placeholderTextColor={C.textLight}
        />
        {searchResults.map(i => {
          const on = selected.has(i.id);
          return (
            <TouchableOpacity key={i.id} style={st.searchRow} onPress={() => toggle(i)}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? C.primary : C.textLight} />
              <Text style={st.searchName}>{i.name}</Text>
              <Text style={st.searchCat}>{i.category}</Text>
            </TouchableOpacity>
          );
        })}
        {extraSelected.length > 0 && (
          <View style={st.extraRow}>
            {extraSelected.map(([id, name]) => (
              <TouchableOpacity key={id} style={st.extraChip} onPress={() => toggle({ id, name })}>
                <Text style={st.extraText}>{name}  ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={[st.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[st.cta, selected.size === 0 && { opacity: 0.45 }]}
          disabled={selected.size === 0}
          onPress={() => goRecommend([...selected.keys()])}
          activeOpacity={0.85}
        >
          <Text style={st.ctaText}>
            {selected.size
              ? t('ingredientSuggest.cta', { count: selected.size })
              : t('ingredientSuggest.ctaNone')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => goRecommend([])} style={st.skip} hitSlop={8}>
          <Text style={st.skipText}>{t('ingredientSuggest.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerSide: { width: 80 },
  back: { color: C.textMid, fontSize: F.base, fontFamily: 'BeVietnamPro-SemiBold' },
  headerTitle: { fontSize: F.lg, color: C.text, fontFamily: 'Lora-Bold' },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  intro: { fontSize: F.lg, color: C.woodDark, fontFamily: 'BeVietnamPro-Bold', marginBottom: 4, lineHeight: 24 },
  hint: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', marginBottom: 16 },
  sectionTitle: { fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-Bold', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%', padding: 12, borderRadius: R.lg, backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.borderLight, ...shadow(1),
  },
  cardOn: { borderColor: C.primary, backgroundColor: C.parchmentLight },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardName: { flex: 1, fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-SemiBold' },
  cardNameOn: { fontFamily: 'BeVietnamPro-Bold', color: C.woodDark },
  check: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  reason: {
    fontSize: 11, color: C.woodDark, backgroundColor: C.parchmentDark, borderRadius: R.pill,
    paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden', fontFamily: 'BeVietnamPro-SemiBold',
  },
  dishCount: { fontSize: 11, color: C.textLight, fontFamily: 'BeVietnamPro-Regular', marginTop: 6 },
  reasonBox: {
    backgroundColor: '#FFF4DB', borderRadius: R.md, borderWidth: 1, borderColor: C.amber,
    padding: 10, marginBottom: 10,
  },
  reasonText: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', lineHeight: 19 },
  reasonLink: { fontSize: F.sm, color: C.primary, fontFamily: 'BeVietnamPro-Bold', marginTop: 6 },
  center: { alignItems: 'center', paddingVertical: 40 },
  muted: { color: C.textMid, fontSize: F.sm, fontFamily: 'BeVietnamPro-Regular', marginTop: 10, textAlign: 'center' },
  retry: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 8, borderRadius: R.pill, backgroundColor: C.primary },
  retryText: { color: '#fff', fontFamily: 'BeVietnamPro-Bold' },
  refresh: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 18 },
  refreshText: { color: C.primary, fontSize: F.base, fontFamily: 'BeVietnamPro-Bold' },
  search: {
    backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: F.base, color: C.text, marginBottom: 6,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  searchName: { flex: 1, fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-Regular' },
  searchCat: { fontSize: 11, color: C.textLight, fontFamily: 'BeVietnamPro-Regular' },
  extraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  extraChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.primary },
  extraText: { color: '#fff', fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.borderLight,
  },
  cta: { backgroundColor: C.primary, borderRadius: R.pill, paddingVertical: 15, alignItems: 'center', ...shadow(2) },
  ctaText: { color: '#fff', fontSize: F.lg, fontFamily: 'BeVietnamPro-Bold' },
  skip: { alignItems: 'center', paddingTop: 10 },
  skipText: { color: C.textLight, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
});

export default IngredientSuggestScreen;
