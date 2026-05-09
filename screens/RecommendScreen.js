import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, ImageBackground, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import {
  saveSession, saveDishesToSession,
  loadRecentDishesCache, saveRecentDishesCache,
  getRecentDishIds, loadSessions, loadDishesBySession,
  pruneOldSessions, getSavedDishes, saveDish, removeSavedDish,
} from '../utils/database';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard from '../components/ui/PaperCard';
import SectionHeader from '../components/ui/SectionHeader';
import MetaChip from '../components/ui/MetaChip';
import {
  addDishToMealPlan, getMealPlan, getTodayDateStr,
} from '../services/mealPlanService';

// ── Assets ────────────────────────────────────────────────────────────────────
const ASSETS = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_SESSIONS_STORED = 20; // Số session tối đa lưu trên Firestore

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor = (score) => {
  const p = score * 100;
  if (p >= 85) return C.accentGreen || '#4A7C59';
  if (p >= 70) return C.accentGold || '#C8860A';
  return C.textSecondary || '#A0784A';
};

const LOADING_MSGS = [
  {
    eyebrow: 'ĐỀ XUẤT HÔM NAY',
    title: 'Đang tuyển chọn món dành cho bạn',
    detail: 'Hệ thống đang đối chiếu thời tiết, khẩu vị và nguyên liệu hiện có.',
  },
  {
    eyebrow: 'PHÂN TÍCH NGỮ CẢNH',
    title: 'Đọc vị thời tiết và nhịp ăn hôm nay',
    detail: 'Ưu tiên những món hợp thời điểm, dễ ăn và đúng nhu cầu hiện tại.',
  },
  {
    eyebrow: 'CÁ NHÂN HÓA GỢI Ý',
    title: 'Tinh chỉnh theo khẩu vị riêng của bạn',
    detail: 'Bộ lọc đang cân bằng sở thích, thời gian nấu và mức chi phí mong muốn.',
  },
  {
    eyebrow: 'SẮP HOÀN TẤT',
    title: 'Một danh sách gợi ý đẹp và hợp lý đang tới',
    detail: 'Chỉ thêm một chút nữa để hiện ra những lựa chọn đáng thử nhất.',
  },
];

// ── Loading screen ────────────────────────────────────────────────────────────
const LoadingView = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MSGS.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <ScreenBackground texture="sky">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LottieView
          source={require('../assets/animations/food around the city.json')}
          autoPlay loop speed={1.4}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
        <ImageBackground source={ASSETS.wood} style={s.loadingCard} imageStyle={{ borderRadius: 20, opacity: 0.88 }} resizeMode="cover">
          <View style={s.loadingCardInner}>
            <Text style={s.loadingEyebrow}>{LOADING_MSGS[idx].eyebrow}</Text>
            <Text style={s.loadingText}>{LOADING_MSGS[idx].title}</Text>
            <Text style={s.loadingDetail}>{LOADING_MSGS[idx].detail}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
              {LOADING_MSGS.map((_, i) => (
                <View key={i} style={{
                  width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                  backgroundColor: i === idx ? C.text : 'rgba(92,58,30,0.10)',
                  borderWidth: i === idx ? 0 : 0.5,
                  borderColor: C.border,
                }} />
              ))}
            </View>
          </View>
        </ImageBackground>
      </View>
    </ScreenBackground>
  );
};


// ── Top dish card (rank 1–3, horizontal scroll) ───────────────────────────────
const TopCard = ({ item, onPress, isAdded, onAddToMeal, isSaved, onToggleSave }) => {
  const isFirst = item.rank === 1;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <ImageBackground
        source={ASSETS.paper}
        style={[s.topCard, isFirst && s.topCardFirst]}
        imageStyle={[s.topCardImg, isFirst && { opacity: 0.95 }]}
        resizeMode="cover"
      >
        <View style={{ backgroundColor: isFirst ? 'rgba(255,248,220,0.25)' : 'rgba(255,255,255,0.20)', borderRadius: 22, overflow: 'hidden' }}>
          {/* Image */}
          <View style={s.topImgWrap}>
            {item.image_url
              ? <Image source={{ uri: item.image_url }} style={s.topImg} resizeMode="cover" />
              : <View style={[s.topImg, { backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 44 }}>🍜</Text>
                </View>}

            {/* Rank stamp */}
            <ImageBackground source={ASSETS.wood} style={s.rankStamp} imageStyle={{ borderRadius: 14, opacity: 0.90 }} resizeMode="cover">
              <View style={{ backgroundColor: 'rgba(92,58,30,0.30)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={s.rankText}>#{item.rank}</Text>
              </View>
            </ImageBackground>

            {/* Boost badge */}
            {item.ingredient_boost > 0 && (
              <View style={s.boostBadge}>
                <Text style={s.boostText}>🛒 +{Math.round(item.ingredient_boost * 100)}%</Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={s.topBody}>
            <View style={s.topPrimaryInfo}>
              <Text style={s.topTitle} numberOfLines={2}>{item.title}</Text>
              <View style={s.chipRow}>
                <MetaChip 
                  icon={<Ionicons name="time-outline" size={11} color={C.textMid}/>} 
                  label={`${item.cook_time_min}p`} 
                />
                <MetaChip 
                  variant="accent" 
                  icon={<Ionicons name="star" size={11} color={C.accentGreen}/>} 
                  label={`${(item.final_score * 100).toFixed(0)}%`} 
                />
                {item.nation && (
                  <MetaChip label={item.nation} />
                )}
              </View>
            </View>
            {item.explanation?.[0] && (
              <Text style={s.topHint} numberOfLines={2}>{item.explanation[0]}</Text>
            )}
            {/* ── Nút Thêm vào bữa + Bookmark ── */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onAddToMeal(item); }}
                style={[s.addMealBtn, isAdded && s.addMealBtnDone]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                  size={14}
                  color={isAdded ? '#22C55E' : '#60A5FA'}
                />
                <Text style={[s.addMealText, isAdded && s.addMealTextDone]}>
                  {isAdded ? 'Đã thêm vào bữa' : 'Thêm vào bữa'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onToggleSave(item); }}
                style={[s.bookmarkBtn, isSaved && s.bookmarkBtnSaved]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={14}
                  color={isSaved ? '#F59E0B' : C.textMid}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

// ── List row (rank 4+) ────────────────────────────────────────────────────────
const ListRow = ({ item, onPress, isAdded, onAddToMeal, isSaved, onToggleSave }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
    <ImageBackground
      source={ASSETS.paper}
      style={s.row}
      imageStyle={s.rowImg2}
      resizeMode="cover"
    >
      <View style={s.rowInner}>
        {/* Dish image */}
        <View style={s.rowImgWrap}>
          {item.image_url
            ? <Image source={{ uri: item.image_url }} style={s.rowImg} resizeMode="cover" />
            : <View style={[s.rowImg, { backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 24 }}>🍜</Text>
              </View>}
          {/* Rank pill on image */}
          <View style={s.rowRankPill}>
            <Text style={s.rowRankText}>#{item.rank}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={s.rowContent}>
          <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
          <View style={s.rowMetaRow}>
            <View style={s.rowMetaItem}>
              <Ionicons name="time-outline" size={11} color={C.textLight} />
              <Text style={s.rowMetaText}>{item.cook_time_min}p</Text>
            </View>
            <View style={[s.rowMetaItem, { backgroundColor: 'rgba(56, 176, 122, 0.08)', paddingHorizontal: 6, borderRadius: 6 }]}>
              <Ionicons name="star" size={11} color={C.accentGreen} />
              <Text style={[s.rowMetaText, { color: C.accentGreen, fontFamily: 'Nunito_700Bold' }]}>
                {(item.final_score * 100).toFixed(0)}%
              </Text>
            </View>
            {item.nation && (
              <View style={s.rowMetaItem}>
                <Text style={s.rowMetaText}>{item.nation}</Text>
              </View>
            )}
          </View>
          {item.explanation?.[0] && (
            <Text style={s.rowHint} numberOfLines={1}>{item.explanation[0]}</Text>
          )}
          {/* ── Nút Thêm vào bữa + Bookmark (row) ── */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onAddToMeal(item); }}
              style={[s.addMealBtnRow, isAdded && s.addMealBtnDone]}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                size={13}
                color={isAdded ? '#22C55E' : '#60A5FA'}
              />
              <Text style={[s.addMealText, isAdded && s.addMealTextDone, { fontSize: 11 }]}>
                {isAdded ? 'Đã thêm' : 'Thêm vào bữa'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onToggleSave(item); }}
              style={[s.bookmarkBtn, isSaved && s.bookmarkBtnSaved]}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={13}
                color={isSaved ? '#F59E0B' : C.textMid}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={C.textLight} style={{ paddingRight: 12 }} />
      </View>
    </ImageBackground>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
const RecommendScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { searchParams = {} } = route.params || {};
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
  const { setCurrentSessionId, profile, activeProfileId }    = useAppStore();

  // ── Meal plan state: set của dish_id đã thêm vào bữa hôm nay ──────────────
  const [addedDishIds, setAddedDishIds] = useState(new Set());
  // ── Saved dishes state: set của dish_id đã bookmark ──────────────────────
  const [savedDishIds, setSavedDishIds] = useState(new Set());
  // Toast feedback
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
      // Load saved dishes
      const saved = await getSavedDishes();
      setSavedDishIds(new Set(saved.map(d => String(d.dish_id))));
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
    showToast(`✅ Đã thêm "${dish.title}" vào bữa hôm nay!`);
  }, [profile, activeProfileId, showToast]);

  // Handler bookmark / bỏ bookmark món
  const handleToggleSave = useCallback(async (dish) => {
    const id = String(dish.dish_id);
    const isSaved = savedDishIds.has(id);
    if (isSaved) {
      await removeSavedDish(id);
      setSavedDishIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      showToast(`🔖 Đã bỏ lưu "${dish.title}"`);
    } else {
      await saveDish(dish);
      setSavedDishIds(prev => new Set([...prev, id]));
      showToast(`🔖 Đã lưu "${dish.title}" vào yêu thích!`);
    }
  }, [savedDishIds, showToast]);

  useEffect(() => {
    fetchFirstPage();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

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
          explanation: d.explanation || [], image_url: d.image_url || '',
          url: d.url || '', score_breakdown: d.score_breakdown || {},
        })));
      }

      // ── Xóa session cũ trong background — không await, không block UI ──────
      pruneOldSessions(MAX_SESSIONS_STORED).catch(e =>
        console.warn('[RecommendScreen] pruneOldSessions error:', e)
      );

    } catch (e) { console.error('persistSession:', e); }
  };

  const weather = searchParams?.weather;
  const weatherPill = weather ? `${weather.temperature}°C · ${weather.condition || ''}` : null;
  const cuisineLabel = searchParams?.cuisine_scope === 'global' ? 'Toàn cầu' : 'Việt Nam';
  const typeLabel = searchParams?.dish_type_filter === 'soup'      ? 'Canh' :
                    searchParams?.dish_type_filter === 'main_dish' ? 'Món mặn' : 'Tất cả';

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        <LoadingView />
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenBackground texture="sky" edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header (paper strip) ── */}
      <ImageBackground
        source={ASSETS.paper}
        style={[s.header, { paddingTop: insets.top + 10 }]}
        imageStyle={{ opacity: 0.92 }}
        resizeMode="cover"
      >
        <View style={s.headerInner}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[s.headerAction, s.backBtn]}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Quay lai"
          >
            <Ionicons name="chevron-back" size={18} color={C.textMid} />
            <Text style={s.backText}> Quay lại</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Gợi ý món ăn</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* Nút Bữa hôm nay */}
           
            <TouchableOpacity
              onPress={fetchFirstPage}
              style={[s.headerAction, s.refreshBtn]}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Lam moi goi y mon an"
            >
              <Ionicons name="refresh" size={17} color={C.accentGold} />
              <Text style={s.refreshText}> Làm mới</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Context pills */}
        <View style={s.pillRow}>
          {weatherPill && (
            <MetaChip 
              icon={<Ionicons name="sunny-outline" size={13} color={C.accentGold}/>} 
              label={weatherPill}
              style={s.headerChip}
            />
          )}
          <MetaChip 
            icon={
              searchParams?.cuisine_scope === 'global'
                ? <Ionicons name="earth" size={12} color={C.accentBlue} />
                : <Ionicons name="flag" size={12} color={C.accentRed} />
            }
            label={cuisineLabel} 
            style={s.headerChip}
          />
          <MetaChip 
            icon={
              searchParams?.dish_type_filter === 'soup'
                ? <Ionicons name="water-outline" size={12} color={C.accentBlue} />
                : searchParams?.dish_type_filter === 'main_dish'
                  ? <Ionicons name="restaurant-outline" size={12} color={C.amber} />
                  : <Ionicons name="grid-outline" size={12} color={C.textMid} />
            }
            label={typeLabel} 
            style={s.headerChip}
          />
          <View style={{ flex: 1 }} />
          <MetaChip 
            variant="accent" 
            label={totalDishes > 0 ? `${totalDishes} gợi ý` : `${dishes.length} gợi ý`} 
            style={s.resultChip}
          />
        </View>
      </ImageBackground>

      {/* ── Offline banner ── */}
      {error === 'offline' && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>📡 Đang hiển thị dữ liệu đã lưu (offline)</Text>
        </View>
      )}

      {/* ── Basket small-pool warning ── */}
      {basketWarning && (
        <View style={s.basketWarnBanner}>
          <View style={s.basketWarnHeader}>
            <Text style={s.basketWarnIcon}>⚠️</Text>
            <Text style={s.basketWarnTitle}>
              Chỉ tìm thấy {basketWarning.count} món từ giỏ nguyên liệu của bạn
            </Text>
          </View>
          <Text style={s.basketWarnBody}>
            Những món này đến đúng từ nguyên liệu bạn đã chọn, nhưng các thông số sức khỏe
            (natri, chỉ số đường huyết…) có thể chưa được lọc tối ưu theo tình trạng của bạn.
          </Text>
          <Text style={s.basketWarnBody}>
            Để đảm bảo an toàn, bạn có thể tìm kiếm thêm trên{' '}
            <Text style={s.basketWarnLink}>Google</Text> hoặc{' '}
            <Text style={s.basketWarnLink}>nền tảng y tế</Text> để xác nhận món phù hợp với sức khỏe của bạn.
          </Text>
          <TouchableOpacity
            onPress={() => setBasketWarning(null)}
            style={s.basketWarnDismiss}
            activeOpacity={0.7}
          >
            <Text style={s.basketWarnDismissText}>Đã hiểu, đóng thông báo</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Top 3 horizontal scroll ── */}
        {dishes.length > 0 && (
          <>
            <SectionHeader title="✨ Gợi ý hàng đầu" />

            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 24, paddingRight: 12, gap: 16, paddingBottom: 8 }}
            >
              {dishes.slice(0, 3).map((item, idx) => (
                <TopCard
                  key={item.dish_id != null ? `top_${item.dish_id}` : `top_rank_${item.rank ?? idx}`}
                  item={item}
                  isAdded={addedDishIds.has(item.dish_id)}
                  onAddToMeal={handleAddToMeal}
                  isSaved={savedDishIds.has(String(item.dish_id))}
                  onToggleSave={handleToggleSave}
                  onPress={() => navigation.navigate('DishDetail', { dish: item })}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* ── List rows rank 4+ ── */}
        {dishes.length > 3 && (
          <View style={{ marginTop: 16 }}>
            <SectionHeader title="Gợi ý khác" />
            {dishes.slice(3).map((item, idx) => (
              <ListRow
                key={item.dish_id != null ? `list_${item.dish_id}` : `list_rank_${item.rank ?? idx + 3}`}
                item={item}
                isAdded={addedDishIds.has(item.dish_id)}
                onAddToMeal={handleAddToMeal}
                isSaved={savedDishIds.has(String(item.dish_id))}
                onToggleSave={handleToggleSave}
                onPress={() => navigation.navigate('DishDetail', { dish: item })}
              />
            ))}

            {hasNextPage && (
              <TouchableOpacity
                onPress={fetchNextPage}
                disabled={isLoadingMore}
                activeOpacity={0.80}
              >
                <ImageBackground source={ASSETS.paper} style={s.loadMoreBtn} imageStyle={{ borderRadius: 18, opacity: 0.85 }} resizeMode="cover">
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 18, paddingVertical: 14, alignItems: 'center' }}>
                    {isLoadingMore
                      ? <ActivityIndicator color={C.text} />
                      : <Text style={s.loadMoreText}>
                          Xem thêm gợi ý · Trang {currentPage + 1}/{totalPages} ↓
                        </Text>
                    }
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Empty state ── */}
        {error === 'empty' && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 52 }}>🍽️</Text>
            <Text style={[s.sectionTitle, { marginHorizontal: 0, marginTop: 12 }]}>Chưa có gợi ý nào</Text>
            <Text style={s.emptyMeta}>Kiểm tra kết nối mạng</Text>
            <TouchableOpacity onPress={fetchFirstPage} activeOpacity={0.80} style={{ marginTop: 20 }}>
              <ImageBackground source={ASSETS.wood} style={s.retryBtn} imageStyle={{ borderRadius: 18, opacity: 0.88 }} resizeMode="cover">
                <View style={{ backgroundColor: 'rgba(92,58,30,0.22)', borderRadius: 18, paddingVertical: 13, paddingHorizontal: 32 }}>
                  <Text style={s.retryText}>Thử lại</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Toast feedback ── */}
      <Animated.View style={[s.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={s.toastText}>{toastMsg}</Text>
      </Animated.View>

    </ScreenBackground>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 4,
  },
  headerInner: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    position: 'relative',
  },
  headerAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(92,58,30,0.12)',
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  backBtn: {
    paddingLeft: 10,
    paddingRight: 12,
  },
  backText: {
    fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.textMid,
  },
  headerTitle: {
    position: 'absolute',
    left: 112,
    right: 112,
    bottom: 20,
    textAlign: 'center',
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: C.text,
  },
  refreshBtn: {
    paddingLeft: 12,
    paddingRight: 12,
  },
  refreshText: {
    fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.accentGold,
  },

  // Pills
  pillRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingBottom: 16, paddingTop: 4,
  },
  headerChip: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderColor: 'rgba(92,58,30,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  resultChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 176, 122, 0.12)',
    borderColor: 'rgba(56, 176, 122, 0.25)',
  },

  // Offline
  offlineBanner: {
    backgroundColor: 'rgba(200,134,10,0.12)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  offlineText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: C.accentGold,
  },

  // Basket small-pool warning banner
  basketWarnBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  basketWarnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  basketWarnIcon: {
    fontSize: 16,
  },
  basketWarnTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  basketWarnBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  basketWarnLink: {
    fontFamily: 'Nunito_700Bold',
    color: '#1D4ED8',
    textDecorationLine: 'underline',
  },
  basketWarnDismiss: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  basketWarnDismissText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: '#92400E',
  },

  // Section
  sectionTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 17, color: C.text,
  },

  // Loading card
  loadingCard: {
    borderRadius: 20, overflow: 'hidden', marginTop: 12,
    marginHorizontal: 32,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 4,
  },
  loadingCardInner: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingEyebrow: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: C.textLight,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  loadingText: {
    fontFamily: 'Nunito_700Bold', fontSize: 19,
    color: C.text, textAlign: 'center',
    lineHeight: 25,
  },
  loadingDetail: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: C.textMid,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },

  // Top card
  topCard: {
    width: 240, borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 6,
  },
  topCardFirst: {
    width: 260, borderWidth: 1.5, borderColor: 'rgba(200,134,10,0.3)',
  },
  topCardImg: { borderRadius: 24, opacity: 0.88 },
  topImgWrap: { height: 160, position: 'relative' },
  topImg:     { width: '100%', height: '100%' },

  rankStamp: {
    position: 'absolute', top: 10, left: 10,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 3,
  },
  rankText: {
    fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#FFFFFF',
  },
  boostBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(200,134,10,0.88)',
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
  },
  boostText: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#FFFFFF',
  },
  topBody: { 
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    height: 154,
    justifyContent: 'space-between',
  },
  topPrimaryInfo: {
    minHeight: 78,
    justifyContent: 'flex-start',
  },
  topTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 16,
    color: C.text, lineHeight: 22,
    minHeight: 44,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  topHint: {
    fontFamily: 'Caveat_400Regular', fontSize: 14,
    color: C.textMid, marginTop: 12, lineHeight: 18,
  },

  // List row
  row: {
    marginHorizontal: 24, marginBottom: 12,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  rowImg2:  { borderRadius: 18, opacity: 0.88 },
  rowInner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  rowImgWrap: { width: 80, height: 80, position: 'relative' },
  rowImg:     { width: '100%', height: '100%' },
  rowRankPill: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(92,58,30,0.62)',
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  rowRankText: {
    fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#FFFFFF',
  },
  rowContent: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  rowTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 15, color: C.text,
  },
  rowMetaRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  rowMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowMetaText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: C.textMid,
  },
  rowHint: {
    fontFamily: 'Caveat_400Regular', fontSize: 14,
    color: C.textSecondary, marginTop: 6,
  },

  // Load more / retry
  loadMoreBtn: {
    marginHorizontal: 24, marginTop: 12,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: C.borderLight,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  loadMoreText: {
    fontFamily: 'Nunito_700Bold', fontSize: 15, color: C.text,
  },
  retryBtn: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(160,120,74,0.40)',
  },
  retryText: {
    fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#FFFFFF',
  },
  emptyMeta: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: C.textMid, marginTop: 6,
  },

  // ── Meal plan button (header) ─────────────────────────────────────────────
  mealPlanBtn: {
    paddingHorizontal: 12,
    position: 'relative',
  },
  mealPlanBtnText: { fontSize: 18 },
  mealPlanBadge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#4ADE80',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  mealPlanBadgeText: {
    fontFamily: 'Nunito_700Bold', fontSize: 9, color: '#fff',
  },

  // ── Add to meal buttons ───────────────────────────────────────────────────
  addMealBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1,
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },
  addMealBtnDone: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(74,222,128,0.10)',
  },
  addMealBtnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },
  addMealText: {
    fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#60A5FA',
  },
  addMealTextDone: { color: '#22C55E' },

  // ── Bookmark button ───────────────────────────────────────────────────────
  bookmarkBtn: {
    width: 30, height: 30,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(92,58,30,0.18)',
    backgroundColor: 'rgba(255,255,255,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },
  bookmarkBtnSaved: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,0.10)',
  },

  // ── Toast overlay ─────────────────────────────────────────────────────────
  toast: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: 'rgba(61,43,31,0.88)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12,
    maxWidth: '85%',
  },
  toastText: {
    fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#F5EDDC', textAlign: 'center',
  },
});

export default RecommendScreen;
