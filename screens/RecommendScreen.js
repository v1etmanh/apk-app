import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import {
  saveSession, saveDishesToSession,
  loadRecentDishesCache, saveRecentDishesCache,
  getRecentDishIds, loadSessions, loadDishesBySession,
  pruneOldSessions, getSavedDishes, saveDish, removeSavedDish,
  getSetting, setSetting,
} from '../utils/database';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { C, shadow } from '../theme';
import WoodButton from '../components/ui/WoodButton';
import { MascotCat, MascotSays } from '../components/ui/Mascot';
import { CircleButton, Pill, DashedNote } from '../components/ui/Notebook';
import { withIngredients } from '../utils/searchParams';
import { hasWhy, whyHeadline, whyTags, reasonView } from '../utils/whyText';
import ResultFilterBar, { DEFAULT_RESULT_FILTERS, sanitizeResultFilters, applyResultFilters } from '../components/ResultFilterBar';
import { formatVnd } from '../utils/price';

// "~56k/phần" — null khi món chưa có giá (cache cũ / server cũ)
const usePriceLabel = (v) => {
  const { t, i18n } = useTranslation();
  const price = formatVnd(v, (i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi');
  return price ? t('price.perServing', { price }) : null;
};
import {
  addDishToMealPlan, getMealPlan, getTodayDateStr,
} from '../services/mealPlanService';

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_SESSIONS_STORED = 20; // Số phiên tối đa lưu trên Supabase

// ── Helpers ───────────────────────────────────────────────────────────────────
// Lý do gợi ý: ưu tiên `why` (server dựng từ sổ cái điểm, app ghép câu theo ngôn ngữ).
// Dữ liệu cũ (cache / phiên đã lưu) chỉ có `explanation` dạng object { headline, tags } hoặc mảng chuỗi.
export const readExplanation = (exp, why, t) => {
  if (t && hasWhy(why)) {
    return {
      headline: whyHeadline(why, t),
      reasons: why.reasons.slice(0, 2).map(r => reasonView(r, t)),
      tags: whyTags(why, t),
    };
  }
  if (Array.isArray(exp)) return { headline: exp[0] || '', reasons: [], tags: [] };
  if (!exp || typeof exp !== 'object') return { headline: '', reasons: [], tags: [] };
  return {
    headline: exp.headline || '',
    reasons: [],
    tags: Array.isArray(exp.tags) ? exp.tags : [],
  };
};

const DishThumb = ({ uri, style, emojiSize = 24 }) => (
  uri
    ? <Image source={{ uri }} style={style} resizeMode="cover" />
    : <View style={[style, s.thumbEmpty]}><Text style={{ fontSize: emojiSize }}>🍜</Text></View>
);

// ── Màn chờ: checklist thật theo đúng dữ liệu gửi đi ───────────────────────────
const LoadingView = ({ weather, picked, allergyCount, onCancel }) => {
  const { t } = useTranslation();
  const steps = [
    weather?.temperature != null
      ? t('recommend.wait.weather', { temp: Math.round(weather.temperature), condition: weather.condition || '' })
      : t('recommend.wait.weatherNone'),
    allergyCount > 0 ? t('recommend.wait.allergy', { count: allergyCount }) : t('recommend.wait.allergyNone'),
    picked.length ? t('recommend.wait.picked') : t('recommend.wait.noPicked'),
    t('recommend.wait.taste'),
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDone(d => Math.min(d + 1, steps.length - 1)), 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={s.waitRoot}>
      <MascotCat slot="loading" size={180} />
      <View style={s.waitBubble}>
        <Text style={s.waitBubbleText}>{t('recommend.wait.bubble')}</Text>
      </View>
      <View style={s.waitCard}>
        {steps.map((label, i) => {
          const state = i < done ? 'done' : i === done ? 'doing' : 'todo';
          return (
            <View key={i}>
              <View style={s.waitRow}>
                {state === 'done' ? (
                  <View style={s.waitDone}><Ionicons name="checkmark" size={14} color="#fff" /></View>
                ) : state === 'doing' ? (
                  <ActivityIndicator size="small" color={C.primary} style={{ width: 24 }} />
                ) : (
                  <View style={s.waitTodo} />
                )}
                <Text style={[s.waitText, state === 'doing' && s.waitTextDoing, state === 'todo' && { color: C.textSoft }]}>{label}</Text>
              </View>
              {i === 2 && picked.length > 0 && (
                <View style={s.waitPicked}>
                  {picked.slice(0, 6).map(p => <Pill key={p.id} label={p.name} />)}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={s.waitCancel} hitSlop={8}>
          <Text style={s.waitCancelText}>{t('recommend.wait.cancel')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Thẻ món hợp nhất (rank 1) ─────────────────────────────────────────────────
const HeroCard = ({ item, onPress, isAdded, onAddToMeal, isSaved, onToggleSave }) => {
  const { t } = useTranslation();
  const exp = readExplanation(item.explanation, item.why, t);
  const priceLabel = usePriceLabel(item.est_cost_vnd);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.hero}>
      <View style={s.heroImgWrap}>
        <DishThumb uri={item.image_url} style={s.heroImg} emojiSize={44} />
        <View style={s.heroBadge}><Text style={s.heroBadgeText}>{t('recommend.bestToday')}</Text></View>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onToggleSave(item); }}
          style={s.heroSave}
          accessibilityRole="button"
          accessibilityLabel={t('recommend.saveDish')}
        >
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={isSaved ? C.amber : C.woodDark} />
        </TouchableOpacity>
      </View>
      <View style={s.heroBody}>
        <Text style={s.heroTitle} numberOfLines={2}>{item.title}</Text>
        {!!exp.headline && <Text style={s.heroHeadline}>{exp.headline}</Text>}
        {exp.reasons.map(r => (
          <View key={r.key} style={s.reasonLine}>
            <Ionicons name={r.icon} size={16} color={r.color} style={{ marginTop: 1 }} />
            <Text style={s.reasonText}>{r.title}</Text>
          </View>
        ))}
        {item.missing_ingredients?.length > 0 && (
          <View style={s.reasonLine}>
            <Ionicons name="cart-outline" size={16} color={C.seasonText} style={{ marginTop: 1 }} />
            <Text style={[s.reasonText, { color: C.seasonText }]}>{t('dish.needToBuy', { list: item.missing_ingredients.join(', ') })}</Text>
          </View>
        )}
        <View style={s.tagRow}>
          {priceLabel ? <Pill label={priceLabel} /> : null}
          {item.cook_time_min ? <Pill label={`⏱ ${t('recommend.minutes', { count: item.cook_time_min })}`} /> : null}
          {exp.tags.slice(0, 3).map(tag => <Pill key={tag} label={tag} tone="fresh" />)}
        </View>
        <WoodButton
          title={isAdded ? `✓ ${t('recommend.addedToMeal')}` : t('recommend.addToMeal')}
          onPress={() => onAddToMeal(item)}
          disabled={isAdded}
          style={{ marginTop: 4 }}
        />
      </View>
    </TouchableOpacity>
  );
};

// ── Dòng món (rank 2+) ────────────────────────────────────────────────────────
const ListRow = ({ item, onPress, isAdded, onAddToMeal, isSaved, onToggleSave }) => {
  const { t } = useTranslation();
  const exp = readExplanation(item.explanation, item.why, t);
  const priceLabel = usePriceLabel(item.est_cost_vnd);
  const meta = [
    priceLabel,
    item.cook_time_min ? `⏱ ${t('recommend.minutes', { count: item.cook_time_min })}` : null,
    exp.tags[0] || null,
    item.missing_ingredients?.length ? t('recommend.missingCount', { count: item.missing_ingredients.length }) : null,
  ].filter(Boolean).join('  ·  ');
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.row}>
      <DishThumb uri={item.image_url} style={s.rowImg} />
      <View style={s.rowContent}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
        {!!exp.headline && <Text style={s.rowHint} numberOfLines={1}>{exp.headline}</Text>}
        <Text style={s.rowMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); onToggleSave(item); }}
        style={s.rowIconBtn}
        accessibilityRole="button"
        accessibilityLabel={t('recommend.saveDish')}
      >
        <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={isSaved ? C.amber : C.textSoft} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); if (!isAdded) onAddToMeal(item); }}
        style={[s.rowAdd, isAdded && s.rowAddDone]}
        accessibilityRole="button"
        accessibilityLabel={isAdded ? t('recommend.added') : `${t('recommend.add')}: ${item.title}`}
      >
        <Ionicons name={isAdded ? 'checkmark' : 'add'} size={22} color={isAdded ? '#fff' : C.woodDark} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const RecommendScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { searchParams = {}, pickedIngredients = [], pickMode, baseParams } = route.params || {};
  const PAGE_SIZE = 10;

  const [dishes, setDishes]               = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [currentPage, setCurrentPage]     = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [hasNextPage, setHasNextPage]     = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalDishes, setTotalDishes]     = useState(0);
  const [error, setError]                 = useState(null);
  const [basketWarning, setBasketWarning] = useState(null); // object khi pool < 10, null bình thường
  const [relaxedFilters, setRelaxedFilters] = useState([]); // bộ lọc theo bữa bị server nới khi pool rỗng
  // Bộ lọc trên danh sách kết quả: chi phí (± 1 mức) + thời gian nấu
  const [resultFilters, setResultFilters] = useState(DEFAULT_RESULT_FILTERS);
  const [filterCounts, setFilterCounts]   = useState(null);
  const [priceBands, setPriceBands]       = useState(null); // khoảng VND của cost_level 1..3 từ server
  const resultFiltersRef = useRef(DEFAULT_RESULT_FILTERS);
  const { setCurrentSessionId, profile, activeProfileId, savedDishIds, toggleSaveDish } = useAppStore();

  // ── Meal plan state ────────────────────────────────────────────────────────
  const [addedDishIds, setAddedDishIds] = useState(new Set());
  // savedDishIds lấy từ store — không cần local state nữa
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  // [FIX ID-M015] AbortController — cancel request cũ nếu user bấm "Làm mới" nhiều lần
  // Ngăn race condition: response sau override response trước theo thứ tự network ngẫu nhiên
  const abortRef = useRef(null);

  // Load meal plan khi màn hình mount
  useEffect(() => {
    (async () => {
      const plan = await getMealPlan(getTodayDateStr());
      const ids = new Set(plan.items.flatMap(i => i.dishes.map(d => d.dish_id)));
      setAddedDishIds(ids);
    })();
  }, []);

  // Toast helper
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [toastOpacity]);

  // Handler thêm món vào bữa
  const handleAddToMeal = useCallback(async (dish) => {
    const profileInfo = {
      profileId:   activeProfileId || 'default',
      displayName: profile?.displayName || profile?.name || 'Bạn',
      avatar:      profile?.avatar || '🧑',
      relation:    profile?.relation || 'self',
    };
    await addDishToMealPlan(profileInfo, dish);
    setAddedDishIds(prev => new Set([...prev, dish.dish_id]));
    showToast(t('recommend.addedToast', { name: dish.title }));
  }, [profile, activeProfileId, showToast]);

  // Handler bookmark — dùng store action thay vì local state
  const handleToggleSave = useCallback(async (dish) => {
    const wasSaved = await toggleSaveDish(dish);
    if (!wasSaved) {
      showToast(t('recommend.savedToast', { name: dish.title }));
    } else {
      showToast(t('recommend.unsavedToast', { name: dish.title }));
    }
  }, [toggleSaveDish, showToast]);

  useEffect(() => {
    // Nạp bộ lọc kết quả lần trước rồi mới tải trang đầu
    (async () => {
      try {
        const raw = await getSetting('last_result_filters');
        if (raw) {
          const f = sanitizeResultFilters(JSON.parse(raw));
          resultFiltersRef.current = f;
          setResultFilters(f);
        }
      } catch {}
      fetchFirstPage();
    })();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const changeResultFilters = (next) => {
    const f = sanitizeResultFilters(next);
    resultFiltersRef.current = f;
    setResultFilters(f);
    setSetting('last_result_filters', JSON.stringify(f)).catch(() => {});
    fetchFirstPage();
  };

  // ✎ Sửa nguyên liệu đã chọn: Gợi ý → quay lại màn chọn; Tủ lạnh → mở lại giỏ nguyên liệu
  const editPicked = () => {
    if (pickMode === 'fridge' && baseParams) {
      navigation.replace('MarketBasket', { baseParams, next: 'recommend' });
    } else {
      navigation.goBack();
    }
  };

  // ── Tải trang đầu (mount hoặc nhấn "Làm mới") ──────────────────────────────
  const fetchFirstPage = async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    setDishes([]);
    setCurrentPage(1);
    setTotalDishes(0);
    setHasNextPage(false);
    setBasketWarning(null);
    await _fetchPage(1, abortRef.current.signal);
    if (!abortRef.current?.signal?.aborted) setIsLoading(false);
  };

  // ── Tải trang tiếp (nhấn "Xem thêm") ──────────────────────────────────────
  const fetchNextPage = async () => {
    if (!hasNextPage || isLoadingMore) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsLoadingMore(true);
    await _fetchPage(currentPage + 1, abortRef.current.signal);
    if (!abortRef.current?.signal?.aborted) setIsLoadingMore(false);
  };

  // ── Hàm gọi API nội bộ ─────────────────────────────────────────────────────
  const _fetchPage = async (page, signal) => {
    try {
      if (!searchParams) {
        const cached = await loadRecentDishesCache();
        if (cached.length) { setDishes(cached); setError('offline'); }
        else {
          const sessions = await loadSessions(1);
          if (sessions.length) { setDishes(await loadDishesBySession(sessions[0].id)); setError('offline'); }
          else setError('empty');
        }
        return;
      }

      const recentDishIds = await getRecentDishIds(3);
      const res = await api.post('/api/v1/recommend', {
        ...searchParams,
        meal_filters: applyResultFilters(searchParams.meal_filters, resultFiltersRef.current),
        recent_dish_ids: recentDishIds,
        page,
        page_size: PAGE_SIZE,
      }, { signal });

      if (signal?.aborted) return;

      const incoming = res.data.ranked_dishes || [];

      if (page === 1) {
        setDishes(incoming);
      } else {
        // [FIX DUPLICATE-KEY] Dedup khi merge page: loại bỏ dish đã có trong prev
        // tránh trường hợp server trả về dish_id trùng giữa 2 page → React warning "duplicate key"
        setDishes(prev => {
          const existingIds = new Set(prev.map(d => d.dish_id));
          const deduped = incoming.filter(d => !existingIds.has(d.dish_id));
          return [...prev, ...deduped];
        });
      }

      setCurrentPage(res.data.page ?? page);
      setTotalPages(res.data.total_pages ?? 1);
      setHasNextPage(res.data.has_next_page ?? false);
      setTotalDishes(res.data.total_dishes ?? incoming.length);

      // ── Basket small-pool warning từ server ──────────────────────────────
      if (page === 1 && res.data.basket_warning) {
        setBasketWarning(res.data.basket_warning);
      }
      if (page === 1) setRelaxedFilters(res.data.relaxed_filters || []);
      if (page === 1 && res.data.filter_counts) setFilterCounts(res.data.filter_counts);
      if (page === 1 && res.data.price_bands) setPriceBands(res.data.price_bands);

      // Chỉ persist session + cache khi tải trang đầu
      if (page === 1) {
        await saveRecentDishesCache(incoming);
        await persistSession(res.data, searchParams);
      }
    } catch (e) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError' || signal?.aborted) return;
      const cached = await loadRecentDishesCache();
      if (cached.length) { setDishes(cached); setError('offline'); }
      else {
        const sessions = await loadSessions(1);
        if (sessions.length) { setDishes(await loadDishesBySession(sessions[0].id)); setError('offline'); }
        else setError('empty');
      }
    }
  };

  const persistSession = async (result, params) => {
    const safeParams = params || {};
    try {
      const ranked = result.ranked_dishes || [];
      const sid = await saveSession({
        created_at: new Date().toISOString(),
        lat: safeParams.lat ?? null,
        lon: safeParams.lon ?? null,
        province: safeParams.location?.province || '',
        cuisine_scope: safeParams.cuisine_scope || '',
        basket_skipped: safeParams.market_basket?.is_skipped ? 1 : 0,
        // Dùng total_dishes từ server (tổng thật), không phải ranked.length (chỉ page 1)
        dish_count: result.total_dishes ?? ranked.length,
        eaten_count: 0,
        top_dishes: ranked.slice(0, 3).map(d => ({
          dish_id: d.dish_id,
          title:   d.title   || '',
          rank:    d.rank    || 0,
        })),
      });
      setCurrentSessionId(sid);
      if (ranked.length) {
        await saveDishesToSession(sid, ranked.map(d => ({
          dish_id: d.dish_id, rank: d.rank, final_score: d.final_score,
          ingredient_boost: d.ingredient_boost || 0, title: d.title,
          nation: d.nation || '', cook_time_min: d.cook_time_min || 0,
          est_cost_vnd: d.est_cost_vnd ?? null, est_cost_level: d.est_cost_level ?? null,
          explanation: d.explanation || [], why: d.why || null, image_url: d.image_url || '', match_pct: d.match_pct,
          url: d.url || '', score_breakdown: d.score_breakdown || {},
        })));
      }

      // ── Xóa session cũ trong background — không await, không block UI ──────
      pruneOldSessions(MAX_SESSIONS_STORED).catch(e =>
        console.warn('[RecommendScreen] pruneOldSessions error:', e)
      );

    } catch (e) { console.error('persistSession:', e); }
  };

  const allergies = useAppStore(st => st.allergies);
  const weather = searchParams?.weather;
  const temp = weather?.temperature;
  const weatherPill = temp != null ? `☀️ ${Math.round(temp)}°C${weather.condition ? ` · ${weather.condition}` : ''}` : null;
  const cuisineLabel = searchParams?.cuisine_scope === 'global' ? t('recommend.global') : t('recommend.vietnam');
  const typeLabel = searchParams?.dish_type_filter === 'soup'      ? t('recommend.soup') :
                    searchParams?.dish_type_filter === 'main_dish' ? t('recommend.mainDish') : t('recommend.all');
  const mascotLine = pickMode === 'fridge' && pickedIngredients.length
    ? t('recommend.mascot.fridge')
    : temp != null && temp >= 30 ? t('recommend.mascot.hot')
    : temp != null && temp <= 20 ? t('recommend.mascot.cold')
    : t('recommend.mascot.mild');

  // Giỏ ít món → tìm thêm món ngoài giỏ (nguyên liệu chỉ còn là ưu tiên mềm)
  const searchBeyondBasket = () => {
    if (!baseParams) { setBasketWarning(null); return; }
    navigation.replace('Recommend', {
      searchParams: withIngredients(baseParams, pickedIngredients.map(p => p.id), 'suggest'),
      pickedIngredients,
      pickMode: 'suggest',
      baseParams,
    });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" />
        <LoadingView
          weather={weather}
          picked={pickedIngredients}
          allergyCount={(allergies || []).length}
          onCancel={() => navigation.goBack()}
        />
      </View>
    );
  }

  const openDish = (item) => navigation.navigate('DishDetail', {
    dish: item,
    pickedIds: pickedIngredients.map(p => p.id),
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={s.header}>
        <CircleButton onPress={() => navigation.goBack()} label={t('recommend.back')} />
        <Text style={s.headerTitle}>{t('recommend.titleToday')}</Text>
        <CircleButton icon="refresh" onPress={fetchFirstPage} label={t('recommend.refresh')} />
      </View>

      {/* Context pills */}
      <View style={s.pillRow}>
        {!!weatherPill && <Pill tone="outline" label={weatherPill} />}
        <Pill tone="outline" label={cuisineLabel} />
        <Pill tone="outline" label={typeLabel} />
        <Pill tone="outline" label={t('recommend.suggestions', { count: totalDishes > 0 ? totalDishes : dishes.length })} />
      </View>

      {/* ── Offline banner ── */}
      {error === 'offline' && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>{t('recommend.offline')}</Text>
        </View>
      )}

      {/* ── Thanh lọc kết quả: nguyên liệu ✎, chi phí, thời gian ── */}
      {!!searchParams && Object.keys(searchParams).length > 0 && (
        <ResultFilterBar
          value={resultFilters}
          onChange={changeResultFilters}
          counts={filterCounts}
          priceBands={priceBands}
          picked={pickedIngredients}
          onEditPicked={editPicked}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: 40 + insets.bottom }]}>

        {/* ── Giỏ ít món ── */}
        {basketWarning && (
          <View style={s.warnCard}>
            <MascotCat slot="oops" size={88} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={s.warnTitle}>{t('recommend.fewTitle', { count: basketWarning.count })}</Text>
              <Text style={s.warnBody}>{t('recommend.fewBody', { count: basketWarning.count })}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={searchBeyondBasket} style={s.warnBtn} activeOpacity={0.8}>
                  <Text style={s.warnBtnText}>{t('recommend.fewMore')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setBasketWarning(null)} style={s.warnClose} hitSlop={6}>
                  <Text style={s.warnCloseText}>{t('recommend.fewClose')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Bộ lọc đã được nới ── */}
        {relaxedFilters.length > 0 && (
          <DashedNote tone="warm" style={s.relaxed}>
            <Ionicons name="options-outline" size={18} color={C.seasonText} />
            <Text style={s.relaxedText}>
              {t('mealFilter.relaxed', { list: relaxedFilters.map(k => t(`mealFilter.relaxedNames.${k}`, { defaultValue: k })).join(', ') })}
            </Text>
          </DashedNote>
        )}

        {dishes.length > 0 && (
          <MascotSays slot="result" size={64} text={mascotLine} align="center" style={{ marginBottom: 12 }} />
        )}

        {/* ── Món hợp nhất ── */}
        {dishes.length > 0 && (
          <HeroCard
            item={dishes[0]}
            isAdded={addedDishIds.has(dishes[0].dish_id)}
            onAddToMeal={handleAddToMeal}
            isSaved={savedDishIds.has(String(dishes[0].dish_id))}
            onToggleSave={handleToggleSave}
            onPress={() => openDish(dishes[0])}
          />
        )}

        {/* ── Các món còn lại ── */}
        {dishes.length > 1 && (
          <View style={{ marginTop: 16, gap: 10 }}>
            <Text style={s.sectionTitle}>{t('recommend.other')}</Text>
            {dishes.slice(1).map((item, idx) => (
              <ListRow
                key={item.dish_id != null ? `list_${item.dish_id}` : `list_rank_${item.rank ?? idx + 1}`}
                item={item}
                isAdded={addedDishIds.has(item.dish_id)}
                onAddToMeal={handleAddToMeal}
                isSaved={savedDishIds.has(String(item.dish_id))}
                onToggleSave={handleToggleSave}
                onPress={() => openDish(item)}
              />
            ))}
          </View>
        )}

        {hasNextPage && (
          <TouchableOpacity onPress={fetchNextPage} disabled={isLoadingMore} activeOpacity={0.8} style={s.loadMoreBtn}>
            {isLoadingMore
              ? <ActivityIndicator color={C.woodDark} />
              : <Text style={s.loadMoreText}>{t('recommend.loadMore', { page: currentPage + 1, total: totalPages })}</Text>}
          </TouchableOpacity>
        )}

        {!hasNextPage && dishes.length > 0 && error !== 'offline' && (
          <View style={s.endWrap}>
            <MascotCat slot="end" size={96} />
            <Text style={s.endText}>{t('recommend.endOfList')}</Text>
          </View>
        )}

        {/* ── Empty state ── */}
        {error === 'empty' && (
          <View style={s.endWrap}>
            <MascotCat slot="oops" size={96} />
            <Text style={s.sectionTitle}>{t('recommend.noSuggestions')}</Text>
            <Text style={s.emptyMeta}>{t('recommend.checkNetwork')}</Text>
            <WoodButton title={t('recommend.retry')} onPress={fetchFirstPage} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </View>
        )}
      </ScrollView>

      {/* ── Toast feedback ── */}
      <Animated.View style={[s.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={s.toastText}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  headerTitle: { fontSize: 19, fontFamily: 'Lora-Bold', color: C.text },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 },
  offlineBanner: { backgroundColor: C.seasonBg, paddingHorizontal: 16, paddingVertical: 8 },
  offlineText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12, color: C.seasonText },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 17, fontFamily: 'Lora-SemiBold', color: C.text },

  // Màn chờ
  waitRoot: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 110 },
  waitBubble: {
    marginTop: 18, backgroundColor: C.parchmentLight, borderWidth: 1.5, borderColor: C.paperStroke,
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, ...shadow(1),
  },
  waitBubbleText: { fontFamily: 'Patrick Hand', fontSize: 17, lineHeight: 23, color: '#4A3728', textAlign: 'center' },
  waitCard: {
    alignSelf: 'stretch', marginTop: 24, padding: 16, gap: 12, borderRadius: 18,
    backgroundColor: 'rgba(255,248,234,0.85)', borderWidth: 1.5, borderColor: C.border,
  },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waitDone: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.inkGreen, alignItems: 'center', justifyContent: 'center' },
  waitTodo: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#C9B9A8' },
  waitText: { flex: 1, fontSize: 14, fontFamily: 'BeVietnamPro-Regular', color: C.text },
  waitTextDoing: { fontFamily: 'BeVietnamPro-Bold' },
  waitPicked: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 34, marginTop: 8 },
  waitCancel: { marginTop: 'auto', marginBottom: 28, minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  waitCancelText: { fontSize: 14, fontFamily: 'BeVietnamPro-SemiBold', color: C.textMid, textDecorationLine: 'underline' },

  // Thẻ hợp nhất
  hero: {
    backgroundColor: C.parchmentLight, borderRadius: 20, borderWidth: 1.5, borderColor: C.paperStroke,
    overflow: 'hidden', ...shadow(3),
  },
  heroImgWrap: { height: 160 },
  heroImg: { width: '100%', height: '100%' },
  thumbEmpty: { backgroundColor: C.parchmentDark, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: C.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { color: '#fff', fontSize: 11.5, fontFamily: 'BeVietnamPro-Bold' },
  heroSave: {
    position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,248,234,0.95)', alignItems: 'center', justifyContent: 'center',
  },
  heroBody: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 7 },
  heroTitle: { fontSize: 20, fontFamily: 'Lora-Bold', color: C.text },
  heroHeadline: { fontSize: 14, fontFamily: 'Lora-SemiBold', fontStyle: 'italic', color: C.textMid },
  reasonLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  reasonText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: 'BeVietnamPro-Regular', color: C.text },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  // Dòng món
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16,
    backgroundColor: 'rgba(255,248,234,0.85)', borderWidth: 1, borderColor: C.border,
  },
  rowImg: { width: 60, height: 60, borderRadius: 12 },
  rowContent: { flex: 1, minWidth: 0, gap: 1 },
  rowTitle: { fontSize: 15, fontFamily: 'Lora-Bold', color: C.text },
  rowHint: { fontSize: 12.5, fontFamily: 'BeVietnamPro-Regular', color: C.textMid },
  rowMeta: { fontSize: 11.5, fontFamily: 'BeVietnamPro-Regular', color: C.textSoft, marginTop: 2 },
  rowIconBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowAdd: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: C.primary,
    backgroundColor: C.parchmentLight, alignItems: 'center', justifyContent: 'center',
  },
  rowAddDone: { backgroundColor: C.inkGreen, borderColor: C.inkGreen },

  // Cảnh báo
  warnCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, marginBottom: 12, borderRadius: 18,
    backgroundColor: C.parchmentLight, borderWidth: 1.5, borderColor: C.paperStroke, ...shadow(1),
  },
  warnTitle: { fontSize: 15, fontFamily: 'Lora-Bold', color: C.text },
  warnBody: { fontSize: 12.5, lineHeight: 18, fontFamily: 'BeVietnamPro-Regular', color: C.textMid },
  warnBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, justifyContent: 'center' },
  warnBtnText: { fontSize: 12.5, fontFamily: 'BeVietnamPro-Bold', color: C.woodDark },
  warnClose: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  warnCloseText: { fontSize: 12.5, fontFamily: 'BeVietnamPro-SemiBold', color: C.textSoft, textDecorationLine: 'underline' },
  relaxed: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  relaxedText: { flex: 1, fontSize: 12.5, lineHeight: 18, fontFamily: 'BeVietnamPro-SemiBold', color: C.woodDark },

  loadMoreBtn: {
    marginTop: 16, minHeight: 46, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.woodLight, backgroundColor: 'rgba(255,248,234,0.75)',
  },
  loadMoreText: { fontSize: 14, fontFamily: 'BeVietnamPro-Bold', color: C.woodDark },
  endWrap: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  endText: { fontFamily: 'Patrick Hand', fontSize: 16, color: '#4A3728' },
  emptyMeta: { fontSize: 13, fontFamily: 'BeVietnamPro-Regular', color: C.textSoft },

  toast: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: 'rgba(61,43,31,0.88)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12,
    maxWidth: '85%',
  },
  toastText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 13, color: '#F5EDDC', textAlign: 'center' },
});

export default RecommendScreen;
