import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { C, R, F, shadow } from '../theme';
import {
  saveSession, saveDishesToSession, saveFeedback,
  loadSessions, loadDishesBySession,
  getWeatherCache, setWeatherCache, setSetting,
  getRecentDishIds,
  saveRecentDishesCache, loadRecentDishesCache,
} from '../utils/database';

// ── DoodlePad tokens ────────────────────────────────────────────────────────
const DP = {
  primary:    '#60A5FA',
  primaryDk:  '#3B82F6',
  secondary:  '#4ADE80',
  tertiary:   '#FBBF24',
  error:      '#F87171',
  base:       '#FFFFF0',
  surface:    '#FFFFFF',
  textPri:    '#1E1E1E',
  textSec:    '#6B7280',
  border:     '#E5E7EB',
  radiusMd:   16,
  radiusLg:   24,
  radiusFull: 9999,
};
const dpSm = { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, elevation:1 };
const dpMd = { shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.08, shadowRadius:8, elevation:3 };

// ── Loading messages — đổi ngẫu nhiên mỗi lần ──────────────────────────────
const LOADING_MSGS = [
  'Đang tìm món ngon cho bạn...',
  'Phân tích thời tiết hôm nay...',
  'Chọn món phù hợp khẩu vị...',
  'Sắp có gợi ý rồi nhé! 🍜',
];

// ── Lottie Loading Overlay ──────────────────────────────────────────────────
const LoadingOverlay = ({ visible }) => {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setMsgIdx(Math.floor(Math.random() * LOADING_MSGS.length));
    const timer = setInterval(() => {
      setMsgIdx(i => (i + 1) % LOADING_MSGS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // hardwareAccelerated giúp animation mượt hơn trên Android
      hardwareAccelerated>
      {/* Backdrop — chặn mọi touch phía sau */}
      <View style={ovSt.backdrop} pointerEvents="box-only">
        <View style={ovSt.card}>
          <LottieView
            source={require('../assets/animations/food around the city.json')}
            autoPlay
            loop
            speed={2.0} 
            style={ovSt.lottie}
            resizeMode="contain"
          />
          <Text style={ovSt.msg}>{LOADING_MSGS[msgIdx]}</Text>
          {/* Subtle dot indicator */}
          <View style={ovSt.dots}>
            {LOADING_MSGS.map((_, i) => (
              <View
                key={i}
                style={[ovSt.dot, i === msgIdx && ovSt.dotActive]}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ovSt = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFF0',
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  lottie: {
    width: 180,
    height: 180,
  },
  msg: {
    marginTop: 8,
    fontSize: 15,
    fontFamily: 'Nunito',
    fontWeight: '700',
    color: '#1E1E1E',
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: '#60A5FA',
    width: 18,
  },
});

// ── HomeScreen ──────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const isLoadingRef           = React.useRef(false);
  const rankedDishesLengthRef  = React.useRef(0);
  const prevBasketCountRef     = React.useRef(-1);

  const [isLoading, setIsLoading]           = useState(false);
  const [weatherData, setWeatherData]       = useState(null);
  const [cuisineScope, setCuisineScope]     = useState('vietnam');
  const [dishTypeFilter, setDishTypeFilter] = useState('all');
  const [refreshing, setRefreshing]         = useState(false);
  const [basketBadge, setBasketBadge]       = useState(0);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [visibleCount, setVisibleCount]     = useState(10);
  const [isDirty, setIsDirty]               = useState(false);
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setIsDirty(true);
  }, [cuisineScope, dishTypeFilter]);

  const {
    profile, latestMetrics, rankedDishes, setRankedDishes,
    location, setLocation, allergies, currentSessionId,
    setCurrentSessionId, marketBasket, maxPrepTime, costPreference,
  } = useAppStore();

  useEffect(() => {
    rankedDishesLengthRef.current = rankedDishes.length;
  }, [rankedDishes.length]);

  useEffect(() => {
    const count = marketBasket?.selectedIngredients?.length ?? 0;
    setBasketBadge(count);
    if (prevBasketCountRef.current !== -1 && prevBasketCountRef.current !== count) {
      loadRecommendation();
    }
    prevBasketCountRef.current = count;
  }, [marketBasket?.selectedIngredients?.length, marketBasket?.isSkipped]);

  useFocusEffect(useCallback(() => {
    const lat = location?.lat || 16.047;
    const lon = location?.lon || 108.206;
    api.get(`/api/v1/challenge?lat=${lat}&lon=${lon}`)
      .then(r => setChallengeTitle(r.data?.challenge_dish?.title || ''))
      .catch(() => {});
    if (rankedDishesLengthRef.current === 0) {
      loadRecentDishesCache().then(cached => {
        if (cached.length > 0) setRankedDishes(cached);
      });
    }
  }, []));
const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { lat: loc.coords.latitude, lon: loc.coords.longitude };
    } catch {
      return null;
    }
  };

  const buildGridKey = (lat, lon) =>
    `${Math.round(lat * 10) / 10}:${Math.round(lon * 10) / 10}`;

  const fetchWeather = async (lat, lon) => {
    const gridKey = buildGridKey(lat, lon);
    const cached  = await getWeatherCache(gridKey);
    if (cached) {
      if (cached.temperature != null) setWeatherData(cached);
      return cached.weather_vector ?? cached;
    }
    try {
      const res = await api.get(`/api/weather?lat=${lat}&lon=${lon}`);
      const hour = new Date().getHours();
      await setWeatherCache(gridKey, res.data, hour >= 6 && hour < 22 ? 30 : 60);
      setWeatherData(res.data);
      return res.data;
    } catch {
      const fallback = {
        temperature: 30, condition: 'Không rõ (offline)',
        humidity: 70, wind_speed: 10, aqi: 85,
      };
      setWeatherData(fallback);
      return fallback;
    }
  };

  const loadFallbackDishes = async () => {
    try {
      const sessions = await loadSessions(1);
      if (!sessions.length) return [];
      return await loadDishesBySession(sessions[0].id);
    } catch { return []; }
  };

  const persistSession = async (result, params) => {
    try {
      const sid = await saveSession({
        created_at: new Date().toISOString(),
        lat: params.lat, lon: params.lon,
        province: params.province || '',
        food_region: params.food_region || '',
        cuisine_scope: params.cuisineScope,
        basket_skipped: params.marketBasket.isSkipped ? 1 : 0,
      });
      setCurrentSessionId(sid);
      if (result.ranked_dishes?.length) {
        await saveDishesToSession(sid, result.ranked_dishes.map(d => ({
          dish_id: d.dish_id, rank: d.rank, final_score: d.final_score,
          ingredient_boost: d.ingredient_boost || 0, title: d.title,
          nation: d.nation || '', cook_time_min: d.cook_time_min || 0,
          explanation: d.explanation || [], image_url: d.image_url || '',
          url: d.url || '', score_breakdown: d.score_breakdown || {},
        })));
      }
    } catch (e) { console.error('persistSession:', e); }
  };
const loadRecommendation = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    // ✅ Xin quyền & lấy GPS TRƯỚC khi hiện overlay
    const gps = await getUserLocation();

    // Sau đó mới hiện loading
    setIsLoading(true);
    setVisibleCount(10);

    try {
      const currentLocation = gps || location || { lat: 16.047, lon: 108.206, province: 'Đà Nẵng' };
      setLocation(currentLocation);
      if (gps) {
        await setSetting('last_known_lat', String(gps.lat));
        await setSetting('last_known_lon', String(gps.lon));
      }

      const weather = await fetchWeather(currentLocation.lat, currentLocation.lon);

      // ... phần còn lại giữ nguyên

      const personal = {
        age: profile?.age || 25,
        gender: profile?.gender || 'female',
        height: latestMetrics?.height_cm || 160,
        weight: latestMetrics?.weight_kg || 55,
        diet_type: profile?.diet_type || 'omnivore',
        dietary_goal: profile?.dietary_goal || 'maintenance',
        activity_level: profile?.activity_level || 'moderately_active',
        health_condition: profile?.health_condition || [],
        taste_preference: profile?.taste_preference || [],
        allergies: allergies || [],
        max_prep_time: maxPrepTime ?? 60,
      };

      const basket = marketBasket.isSkipped
        ? { is_skipped: true, selected_ingredient_ids: [], boost_strategy: 'none' }
        : {
            is_skipped: false,
            selected_ingredient_ids: marketBasket.selectedIngredients,
            boost_strategy: marketBasket.boostStrategy,
          };

      try {
        const recentDishIds = await getRecentDishIds(3);
        const res = await api.post('/api/v1/recommend', {
          lat: currentLocation.lat,
          lon: currentLocation.lon,
          weather,
          personal,
          cuisine_scope: cuisineScope,
          selected_nation: null,
          dish_type_filter: dishTypeFilter,
          cost_preference: costPreference,   // fix: gửi ở root thay vì trong personal
          market_basket: basket,
          recent_dish_ids: recentDishIds,
        });

        setRankedDishes(res.data.ranked_dishes || []);
        setIsDirty(false);
        await saveRecentDishesCache(res.data.ranked_dishes || []);
        await persistSession(res.data, { ...currentLocation, cuisineScope, marketBasket });
      } catch (apiErr) {
        console.error('recommend API:', apiErr);
        const fallback = await loadFallbackDishes();
        if (fallback.length) {
          setRankedDishes(fallback);
          Alert.alert('Offline', 'Đang hiển thị gợi ý cũ.');
        } else {
          Alert.alert('Lỗi kết nối', 'Kiểm tra IP server.');
        }
      }
    } catch (e) {
      console.error('loadRecommendation:', e);
    } finally {
      // Luôn reset dù thành công hay lỗi
      isLoadingRef.current = false;
      setIsLoading(false);   // → ẩn LoadingOverlay
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecommendation();
    setRefreshing(false);
  };

  const handleQuickFeedback = async (dishId, action) => {
    try {
      if (!currentSessionId) return;
      await saveFeedback({
        session_id: currentSessionId, dish_id: dishId,
        action_type: action, feedback_at: new Date().toISOString(),
      });
    } catch (e) { console.error('handleQuickFeedback:', e); }
  };

  const getWeatherGradient = (temperature, condition) => {
    if (!temperature) return ['#1E3A5F', '#2E86C1'];
    const cond = condition?.toLowerCase() || '';
    if (cond.includes('rain') || cond.includes('mưa')) return ['#1F3A4C', '#2C5364'];
    if (temperature < 20)  return ['#1E3A5F', '#2E86C1'];
    if (temperature <= 28) return ['#1A5276', '#117A65'];
    if (temperature <= 33) return ['#784212', '#E67E22'];
    return ['#7B241C', '#E74C3C'];
  };

  // ── Dish Card (horizontal top-3) ─────────────────────────────────────────
  const renderDishCardH = (item) => (
    <TouchableOpacity key={item.dish_id || item.rank} style={styles.dishCard}
      onPress={() => navigation.navigate('DishDetail', { dish: item })} activeOpacity={0.85}>
      <View style={styles.cardImageWrap}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
          : <View style={styles.imagePlaceholder}><Text style={styles.dishEmoji}>🍜</Text></View>}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{item.rank}</Text>
        </View>
        {item.ingredient_boost > 0 && (
          <View style={styles.boostBadge}>
            <Text style={styles.boostText}>🛒 {Math.round(item.ingredient_boost * 100)}%</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.dishTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaChip}>⏱ {item.cook_time_min}p</Text>
          <Text style={styles.metaChip}>★ {(item.final_score * 100).toFixed(0)}%</Text>
        </View>
        {item.explanation?.length > 0 && (
          <Text style={styles.cardHint} numberOfLines={2}>{item.explanation[0]}</Text>
        )}
        <View style={styles.quickFeedback}>
          <TouchableOpacity style={[styles.fbBtn, styles.eatBtn]}
            onPress={() => handleQuickFeedback(item.dish_id, 'eaten')}>
            <Text style={styles.fbText}>😋 Ăn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fbBtn, styles.skipBtn]}
            onPress={() => handleQuickFeedback(item.dish_id, 'skipped')}>
            <Text style={styles.fbText}>✕ Bỏ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── List Row (rank 4+) ────────────────────────────────────────────────────
  const renderListRow = (item) => (
    <TouchableOpacity key={item.dish_id || item.rank} style={styles.listItem}
      onPress={() => navigation.navigate('DishDetail', { dish: item })} activeOpacity={0.85}>
      <View style={styles.listImageWrap}>
        {item.image_url
          ? <Image source={{ uri: item.image_url }} style={styles.listImage} resizeMode="cover" />
          : <View style={styles.listImageFallback}><Text style={{ fontSize: 22 }}>🍜</Text></View>}
      </View>
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.listMetaRow}>
          <Text style={styles.listMeta}>⏱ {item.cook_time_min}p</Text>
          <Text style={styles.listMeta}>★ {(item.final_score * 100).toFixed(0)}%</Text>
          <Text style={styles.listMeta}>{item.nation || 'Việt Nam'}</Text>
        </View>
        {item.explanation?.[0] && (
          <Text style={styles.listHint} numberOfLines={1}>{item.explanation[0]}</Text>
        )}
      </View>
      <View style={styles.listActions}>
        <TouchableOpacity style={[styles.miniFb, styles.eatBtn]}
          onPress={() => handleQuickFeedback(item.dish_id, 'eaten')}>
          <Text style={{ fontSize: 14 }}>😋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.miniFb, styles.skipBtn]}
          onPress={() => handleQuickFeedback(item.dish_id, 'skipped')}>
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      {/* Lottie overlay — phủ toàn màn hình, block mọi touch khi isLoading */}
      <LoadingOverlay visible={isLoading} />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={DP.primary}
          />
        }>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.province}>{location?.province || 'Đang xác định...'}</Text>
            <Text style={styles.date}>
              Hôm nay, {new Date().toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>

        {/* ── Weather Card ── */}
        <LinearGradient
          colors={getWeatherGradient(weatherData?.temperature, weatherData?.condition)}
          style={styles.weatherCard}>
          <Text style={styles.weatherCity}>{location?.province || 'Vị trí'}</Text>
          {weatherData ? (
            <>
              <Text style={styles.weatherTemp}>{weatherData.temperature}°C</Text>
              <Text style={styles.weatherCond}>{weatherData.condition}</Text>
              <View style={styles.weatherDetails}>
                <Text style={styles.weatherDetail}>💧 {weatherData.humidity}%</Text>
                <Text style={styles.weatherDetail}>💨 {weatherData.wind_speed} km/h</Text>
                <Text style={styles.weatherDetail}>🌫️ AQI {Math.round(weatherData.aqi)}</Text>
              </View>
            </>
          ) : (
            <ActivityIndicator color="white" style={{ marginVertical: 20 }} />
          )}
        </LinearGradient>

        {/* ── Cuisine Scope Toggle ── */}
        <View style={styles.scopeRow}>
          {[{ key: 'vietnam', label: '🇻🇳 Việt Nam' }, { key: 'global', label: '🌍 Toàn cầu' }].map(({ key, label }) => (
            <TouchableOpacity key={key}
              style={[styles.scopeBtn, cuisineScope === key && styles.scopeBtnActive]}
              onPress={() => setCuisineScope(key)}>
              <Text style={[styles.scopeText, cuisineScope === key && styles.scopeTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Dish Type Filter ── */}
        <View style={styles.dishTypeRow}>
          {[
            { key: 'all',       label: '🍽️ Tất cả' },
            { key: 'soup',      label: '🥣 Canh' },
            { key: 'main_dish', label: '🍖 Món mặn' },
          ].map(({ key, label }) => (
            <TouchableOpacity key={key}
              style={[styles.dishTypeBtn, dishTypeFilter === key && styles.dishTypeBtnActive]}
              onPress={() => setDishTypeFilter(key)}>
              <Text style={[styles.dishTypeText, dishTypeFilter === key && styles.dishTypeTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Search Button ── */}
        <TouchableOpacity
          style={[
            styles.searchBtn,
            isDirty && styles.searchBtnDirty,
            isLoading && styles.searchBtnDisabled,
          ]}
          onPress={loadRecommendation}
          disabled={isLoading}
          activeOpacity={0.82}>
          <Text style={styles.searchBtnIcon}>{isDirty ? '✨' : '🔍'}</Text>
          <Text style={styles.searchBtnText}>
            {isDirty ? 'Tìm lại với bộ lọc mới' : 'Tìm món cho tôi'}
          </Text>
        </TouchableOpacity>

        {/* ── Challenge Banner ── */}
        {challengeTitle !== '' && (
          <TouchableOpacity style={styles.challengeBanner}
            onPress={() => navigation.navigate('CookingChallenge')} activeOpacity={0.85}>
            <Text style={styles.challengeIcon}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeLabel}>Thử thách hôm nay</Text>
              <Text style={styles.challengeTitle} numberOfLines={1}>{challengeTitle}</Text>
            </View>
            <Text style={styles.challengeArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Market Basket CTA ── */}
        <TouchableOpacity style={styles.basketCTA}
          onPress={() => navigation.navigate('MarketBasket')} activeOpacity={0.85}>
          <Text style={styles.basketIcon}>🛒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.basketTitle}>
              {basketBadge > 0 ? `Đã chọn ${basketBadge} nguyên liệu` : 'Bạn đã mua gì hôm nay?'}
            </Text>
            <Text style={styles.basketSub}>Tap để cập nhật giỏ hàng</Text>
          </View>
          {basketBadge > 0 && (
            <View style={styles.basketBadge}>
              <Text style={styles.basketBadgeText}>{basketBadge}</Text>
            </View>
          )}
          <Text style={styles.basketArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Horizontal Cards top-3 ── */}
        {rankedDishes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>✨ Gợi ý cho bạn hôm nay</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hListContent}>
              {rankedDishes.slice(0, 3).map(renderDishCardH)}
            </ScrollView>
          </>
        )}

        {/* ── Vertical List rank 4+ ── */}
        {rankedDishes.length > 3 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Gợi ý khác</Text>
            {rankedDishes.slice(3, visibleCount).map(renderListRow)}
            {visibleCount < rankedDishes.length && (
              <TouchableOpacity style={styles.loadMoreBtn}
                onPress={() => setVisibleCount(rankedDishes.length)} activeOpacity={0.8}>
                <Text style={styles.loadMoreText}>Xem thêm gợi ý ↓</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Empty state ── */}
        {!isLoading && rankedDishes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>Chưa có gợi ý nào</Text>
            <Text style={styles.emptySub}>Kéo xuống để tải gợi ý</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: DP.base },

  header:            { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                       paddingHorizontal:16, paddingVertical:14, backgroundColor: DP.surface,
                       borderBottomWidth:2, borderBottomColor: DP.border, borderStyle:'dashed' },
  province:          { fontSize:20, fontWeight:'700', color: DP.textPri, fontFamily:'Patrick Hand' },
  date:              { fontSize:14, color: DP.textSec, marginTop:2 },

  weatherCard:       { marginHorizontal:16, marginTop:12, padding:20,
                       borderRadius: DP.radiusLg, ...dpMd },
  weatherCity:       { color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:'600' },
  weatherTemp:       { fontSize:52, fontWeight:'700', color:'white', marginTop:4 },
  weatherCond:       { fontSize:16, color:'rgba(255,255,255,0.9)', marginTop:-4 },
  weatherDetails:    { flexDirection:'row', justifyContent:'space-around', marginTop:16 },
  weatherDetail:     { color:'rgba(255,255,255,0.85)', fontSize:13 },

  scopeRow:          { flexDirection:'row', marginHorizontal:16, marginTop:12,
                       backgroundColor: DP.surface, borderRadius: DP.radiusFull, padding:4,
                       borderWidth:2, borderColor: DP.border, borderStyle:'dashed', ...dpSm },
  scopeBtn:          { flex:1, paddingVertical:10, alignItems:'center', borderRadius: DP.radiusFull },
  scopeBtnActive:    { backgroundColor: DP.primary },
  scopeText:         { fontSize:14, fontWeight:'600', color: DP.textSec },
  scopeTextActive:   { color:'white' },

  dishTypeRow:       { flexDirection:'row', marginHorizontal:16, marginTop:8,
                       backgroundColor: DP.surface, borderRadius: DP.radiusFull, padding:4,
                       borderWidth:2, borderColor: DP.border, borderStyle:'dashed', ...dpSm },
  dishTypeBtn:       { flex:1, paddingVertical:9, alignItems:'center', borderRadius: DP.radiusFull },
  dishTypeBtnActive: { backgroundColor: DP.tertiary },
  dishTypeText:      { fontSize:12, fontWeight:'600', color: DP.textSec },
  dishTypeTextActive:{ color:'white', fontWeight:'700' },

  searchBtn:         { flexDirection:'row', alignItems:'center', justifyContent:'center',
                       marginHorizontal:16, marginTop:10, paddingVertical:14,
                       backgroundColor: DP.primary, borderRadius: DP.radiusLg,
                       gap:8, ...dpMd },
  searchBtnDirty:    { backgroundColor: DP.tertiary },
  searchBtnDisabled: { opacity:0.6 },
  searchBtnIcon:     { fontSize:18 },
  searchBtnText:     { color:'white', fontSize:15, fontWeight:'700', fontFamily:'Patrick Hand' },

  challengeBanner:   { flexDirection:'row', alignItems:'center', marginHorizontal:16, marginTop:8,
                       backgroundColor:'#FFFBEB', borderRadius: DP.radiusLg, padding:14,
                       borderWidth:2, borderColor: DP.tertiary, borderStyle:'dashed' },
  challengeIcon:     { fontSize:22, marginRight:10 },
  challengeLabel:    { fontSize:11, fontWeight:'700', color:'#92400E', letterSpacing:0.5 },
  challengeTitle:    { fontSize:14, fontWeight:'700', color: DP.textPri, marginTop:2 },
  challengeArrow:    { fontSize:22, color: DP.tertiary, fontWeight:'700' },

  basketCTA:         { flexDirection:'row', alignItems:'center', marginHorizontal:16, marginTop:8,
                       backgroundColor: DP.surface, borderRadius: DP.radiusLg, padding:14,
                       borderWidth:2, borderColor: DP.border, borderStyle:'dashed', ...dpSm },
  basketIcon:        { fontSize:22, marginRight:10 },
  basketTitle:       { fontSize:14, fontWeight:'700', color: DP.textPri },
  basketSub:         { fontSize:12, color: DP.textSec, marginTop:2 },
  basketBadge:       { backgroundColor: DP.primary, borderRadius: DP.radiusFull,
                       paddingHorizontal:8, paddingVertical:3, marginRight:6 },
  basketBadgeText:   { color:'white', fontSize:12, fontWeight:'700' },
  basketArrow:       { fontSize:20, color: DP.border, fontWeight:'300' },

  sectionTitle:      { fontSize:17, fontWeight:'700', marginHorizontal:16,
                       marginTop:16, marginBottom:10, color: DP.textPri },

  hListContent:      { paddingLeft:16, paddingRight:8 },
  dishCard:          { width:204, backgroundColor: DP.surface, borderRadius: DP.radiusLg,
                       marginRight:12, borderWidth:2, borderColor: DP.border,
                       borderStyle:'dashed', overflow:'hidden', ...dpMd },
  cardImageWrap:     { position:'relative', height:120 },
  cardImage:         { width:'100%', height:'100%' },
  imagePlaceholder:  { width:'100%', height:'100%', backgroundColor:'#F3F4F6',
                       justifyContent:'center', alignItems:'center' },
  dishEmoji:         { fontSize:40 },
  rankBadge:         { position:'absolute', top:8, left:8, backgroundColor: DP.primary,
                       borderRadius: DP.radiusFull, paddingHorizontal:8, paddingVertical:3 },
  rankText:          { color:'white', fontSize:11, fontWeight:'700' },
  boostBadge:        { position:'absolute', top:8, right:8, backgroundColor: DP.tertiary,
                       borderRadius: DP.radiusFull, paddingHorizontal:6, paddingVertical:2 },
  boostText:         { color:'white', fontSize:10, fontWeight:'600' },
  cardBody:          { padding:12 },
  dishTitle:         { fontSize:14, fontWeight:'700', color: DP.textPri, lineHeight:20 },
  cardMeta:          { flexDirection:'row', marginTop:6, gap:6 },
  metaChip:          { fontSize:11, color: DP.textSec, backgroundColor:'#F3F4F6',
                       paddingHorizontal:8, paddingVertical:3, borderRadius: DP.radiusFull },
  cardHint:          { fontSize:11, color: DP.textSec, marginTop:6, lineHeight:16 },
  quickFeedback:     { flexDirection:'row', gap:6, marginTop:10 },
  fbBtn:             { flex:1, paddingVertical:8, borderRadius: DP.radiusMd, alignItems:'center' },
  fbText:            { color:'white', fontSize:12, fontWeight:'700' },
  eatBtn:            { backgroundColor: DP.secondary },
  skipBtn:           { backgroundColor: DP.error },

  listItem:          { flexDirection:'row', backgroundColor: DP.surface, marginHorizontal:16,
                       marginBottom:8, borderRadius: DP.radiusMd, borderWidth:1.5,
                       borderColor: DP.border, borderStyle:'dashed', overflow:'hidden', ...dpSm },
  listImageWrap:     { width:76, height:76 },
  listImage:         { width:'100%', height:'100%' },
  listImageFallback: { width:'100%', height:'100%', backgroundColor:'#F3F4F6',
                       justifyContent:'center', alignItems:'center' },
  listContent:       { flex:1, padding:10, justifyContent:'center' },
  listTitle:         { fontSize:14, fontWeight:'700', color: DP.textPri },
  listMetaRow:       { flexDirection:'row', marginTop:4, gap:8 },
  listMeta:          { fontSize:11, color: DP.textSec },
  listHint:          { fontSize:11, color:'#9CA3AF', marginTop:3 },
  listActions:       { width:52, justifyContent:'center', alignItems:'center', gap:6, padding:8 },
  miniFb:            { width:34, height:34, borderRadius: DP.radiusFull,
                       justifyContent:'center', alignItems:'center' },

  loadMoreBtn:       { marginHorizontal:16, marginTop:8, paddingVertical:13,
                       borderRadius: DP.radiusLg, alignItems:'center',
                       backgroundColor: DP.surface, borderWidth:2,
                       borderColor: DP.primary, borderStyle:'dashed', ...dpSm },
  loadMoreText:      { fontSize:14, fontWeight:'700', color: DP.primary },

  emptyState:        { alignItems:'center', paddingVertical:60 },
  emptyIcon:         { fontSize:52, marginBottom:12 },
  emptyTitle:        { fontSize:18, fontWeight:'700', color: DP.textPri },
  emptySub:          { fontSize:14, color: DP.textSec, marginTop:4 },
});

export default HomeScreen;