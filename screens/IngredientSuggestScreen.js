// screens/IngredientSuggestScreen.js
// Bước 1 của "Gợi ý cho tôi": server gợi ý nguyên liệu hợp thời tiết, sức khỏe, khẩu vị
// → user chọn (tick sẵn 1 đạm + 2 rau) → Recommend với các nguyên liệu đó.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, ImageBackground,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { withIngredients } from '../utils/searchParams';
import { C, OCEAN, R, F, shadow } from '../theme';
import WoodButton from '../components/ui/WoodButton';
import { MascotSays } from '../components/ui/Mascot';
import { CircleButton, Pill, CheckDot, DashedNote } from '../components/ui/Notebook';
import IngredientThumb from '../components/ui/IngredientThumb';

const SECTION_META = { protein: '🍗', vegetable: '🥬' };
const SEARCH_CATEGORIES = new Set(['Thịt', 'Hải sản', 'Đậu & Hạt', 'Rau củ', 'Đã chế biến', 'Sữa & Trứng']);
const normalize = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
// Màu chip lý do theo key server trả về (ingredient_suggest.REASON_LABELS)
const REASON_TONE = { cooling: 'fresh', hydration: 'fresh', season: 'season' };

const CARD_IMG_H = 118;

const IngredientCard =({ item, selected, onPress, dishesLabel }) => (
  <TouchableOpacity
    style={[st.card, selected && st.cardOn]}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: selected }}
  >
    {/* Ảnh là nhân vật chính: phủ kín nửa trên thẻ */}
    <View>
      <IngredientThumb
        id={item.id}
        category={item.category}
        size={CARD_IMG_H}
        variant="thumb"
        style={st.cardImg}
      />
      <View style={st.checkWrap}><CheckDot tone="ocean" on={selected} /></View>
      {!!item.reasons?.[0] && (
        <Pill
          label={item.reasons[0].label}
          tone={REASON_TONE[item.reasons[0].key] || 'neutral'}
          style={st.reasonChip}
        />
      )}
    </View>
    <View style={st.cardBody}>
      <Text style={st.cardName} numberOfLines={1}>{item.name}</Text>
      <Text style={st.dishCount}>{dishesLabel}</Text>
    </View>
  </TouchableOpacity>
);

const StepRibbon = ({ t }) => (
  <View style={st.stepRow}>
    <View style={[st.stepBar, st.stepBarOn]} />
    <Text style={st.stepText}>{t('ingredientSuggest.stepIngredients')}</Text>
    <View style={st.stepBar} />
    <Text style={st.stepText}>{t('ingredientSuggest.stepDishes')}</Text>
  </View>
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

  // Nguyên liệu tải lười: lúc khởi động không còn chờ, nên tự tải nếu chưa có.
  useEffect(() => {
    if (allIngredients.length === 0) useAppStore.getState().initializeIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const weather = baseParams?.weather;
  const weatherChip = weather?.temperature != null
    ? `☀️ ${Math.round(weather.temperature)}°C${weather.condition ? ` · ${weather.condition}` : ''}`
    : null;
  const bubbleText = intro || t('ingredientSuggest.hint');
  const pickedNames = [...selected.values()];
  const pickedLabel = pickedNames.slice(0, 3).join(' · ') + (pickedNames.length > 3 ? ` +${pickedNames.length - 3}` : '');

  return (
    <View style={st.root}>
      {/* Cùng dải trời + mép sóng như màn Gợi ý món (bước 2) */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={[st.skyHeader, { paddingTop: insets.top + 12 }]}
        resizeMode="cover"
        imageStyle={{ opacity: 0.55 }}
      >
        <View style={st.header}>
          <CircleButton onPress={() => navigation.goBack()} label={t('common.back')} />
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>{t('ingredientSuggest.title')}</Text>
            <StepRibbon t={t} />
          </View>
          <View style={{ width: 44 }} />
        </View>
        <Svg width="100%" height={20} viewBox="0 0 400 20" preserveAspectRatio="none" pointerEvents="none">
          <Path
            d="M0,6 Q48,18 100,8 Q152,0 200,10 Q248,18 304,7 Q352,0 400,8 L400,20 L0,20 Z"
            fill={C.bg}
          />
        </Svg>
      </ImageBackground>

      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <MascotSays slot="suggest" size={72} text={bubbleText}>
          {!!weatherChip && <Pill tone="outline" label={weatherChip} />}
        </MascotSays>

        {loading ? (
          <View style={st.center}>
            <ActivityIndicator size="large" color={OCEAN.primary} />
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
            {sections.map(sec => {
              const pickedInSec = sec.items.filter(i => selected.has(i.id)).length;
              return (
                <View key={sec.key} style={st.section}>
                  <View style={st.sectionHead}>
                    <Text style={st.sectionTitle}>{SECTION_META[sec.key]} {t(`ingredientSuggest.sections.${sec.key}`)}</Text>
                    {pickedInSec > 0 && (
                      <Text style={st.sectionCount}>{t('ingredientSuggest.pickedInSection', { count: pickedInSec })}</Text>
                    )}
                  </View>
                  {!!sec.empty_reason && (
                    <DashedNote style={{ marginBottom: 10 }}>
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
                    </DashedNote>
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
              );
            })}

            <TouchableOpacity onPress={refresh} style={st.ghostBtn} activeOpacity={0.8}>
              <Ionicons name="refresh" size={16} color={OCEAN.dark} />
              <Text style={st.ghostText}>{t('ingredientSuggest.refresh')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Thêm nguyên liệu khác */}
        <Text style={[st.sectionTitle, { marginBottom: 8 }]}>{t('ingredientSuggest.addOther')}</Text>
        <View style={st.searchBox}>
          <Ionicons name="search" size={18} color={C.textSoft} />
          <TextInput
            style={st.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('ingredientSuggest.searchPlaceholder')}
            placeholderTextColor={C.textLight}
            accessibilityLabel={t('ingredientSuggest.addOther')}
          />
        </View>
        {searchResults.map(i => {
          const on = selected.has(i.id);
          return (
            <TouchableOpacity key={i.id} style={st.searchRow} onPress={() => toggle(i)} activeOpacity={0.75}>
              <CheckDot tone="ocean" on={on} square />
              <IngredientThumb style={st.thumb} id={i.id} category={i.category} size={28} round />
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
        <View style={{ height: 180 }} />
      </ScrollView>

      <View style={[st.footer, { paddingBottom: insets.bottom + 12 }]}>
        {selected.size > 0 && (
          <Text style={st.pickedLine} numberOfLines={1}>
            <Text style={{ fontFamily: 'BeVietnamPro-Bold' }}>{t('ingredientSuggest.pickedLabel')} </Text>
            {pickedLabel}
          </Text>
        )}
        <WoodButton
          title={selected.size
            ? t('ingredientSuggest.cta', { count: selected.size })
            : t('ingredientSuggest.ctaNone')}
          disabled={selected.size === 0}
          onPress={() => goRecommend([...selected.keys()])}
        />
        <TouchableOpacity onPress={() => goRecommend([])} style={st.skip} hitSlop={8}>
          <Text style={st.skipText}>{t('ingredientSuggest.skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Hệ màu khớp màn Gợi ý món: nền giấy + chữ nâu mực; xanh OCEAN chỉ cho trạng thái chọn & hành động.
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  skyHeader: { backgroundColor: '#A8CEDF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
  },
  headerCenter: { alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 22, lineHeight: 30, color: C.text, fontFamily: 'Lora-Bold' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBar: { width: 22, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  stepBarOn: { backgroundColor: OCEAN.primary },
  stepText: { fontSize: 11, color: C.textMid, fontFamily: 'BeVietnamPro-SemiBold' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 0 },
  section: { marginTop: 20 },
  thumb: { backgroundColor: C.chipBg, borderColor: C.border },
  sectionHead: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.paperStroke,
  },
  sectionTitle: { fontSize: F.lg, color: C.text, fontFamily: 'Lora-SemiBold' },
  sectionCount: { fontSize: 12, color: OCEAN.dark, fontFamily: 'BeVietnamPro-SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: {
    width: '48.5%', borderRadius: 18, overflow: 'hidden',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, ...shadow(1),
  },
  cardOn: { borderWidth: 2.5, borderColor: OCEAN.primary, ...shadow(2), shadowColor: OCEAN.shadow },
  cardImg: { width: '100%', height: CARD_IMG_H, borderRadius: 0, borderWidth: 0, backgroundColor: C.chipBg },
  checkWrap: {
    position: 'absolute', top: 8, right: 8, padding: 3, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  reasonChip: { position: 'absolute', left: 8, bottom: 8 },
  cardBody: { paddingHorizontal: 11, paddingTop: 8, paddingBottom: 10, gap: 1 },
  cardName: { fontSize: F.base, color: C.text, fontFamily: 'Lora-Bold' },
  dishCount: { fontSize: 12, color: C.textSoft, fontFamily: 'BeVietnamPro-Regular' },
  reasonText: { fontSize: F.sm, color: C.textMid, fontFamily: 'BeVietnamPro-Regular', lineHeight: 19 },
  reasonLink: { fontSize: F.sm, color: OCEAN.dark, fontFamily: 'BeVietnamPro-Bold', marginTop: 6 },
  center: { alignItems: 'center', paddingVertical: 40 },
  muted: { color: C.textSoft, fontSize: F.sm, fontFamily: 'BeVietnamPro-Regular', marginTop: 10, textAlign: 'center' },
  retry: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: R.pill, backgroundColor: OCEAN.primary },
  retryText: { color: '#fff', fontFamily: 'BeVietnamPro-Bold' },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, marginTop: 16, marginBottom: 20, borderRadius: 16,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: OCEAN.border,
    backgroundColor: OCEAN.soft,
  },
  ghostText: { color: OCEAN.dark, fontSize: F.sm + 1, fontFamily: 'BeVietnamPro-Bold' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46,
    backgroundColor: C.parchmentLight, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, marginBottom: 6,
  },
  searchInput: { flex: 1, fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-Regular', paddingVertical: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  searchName: { flex: 1, fontSize: F.base, color: C.text, fontFamily: 'BeVietnamPro-Regular' },
  searchCat: { fontSize: 11.5, color: C.textSoft, fontFamily: 'BeVietnamPro-Regular' },
  extraRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  extraChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: OCEAN.soft, borderWidth: 1, borderColor: OCEAN.border },
  extraText: { color: OCEAN.dark, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, gap: 8,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  pickedLine: { fontSize: 12.5, color: C.textMid, fontFamily: 'BeVietnamPro-Regular' },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipText: { color: C.textSoft, fontSize: F.sm, fontFamily: 'BeVietnamPro-SemiBold', textDecorationLine: 'underline' },
});

export default IngredientSuggestScreen;
