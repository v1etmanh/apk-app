import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, ImageBackground, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import {
  saveSession, saveDishesToSession,
  loadRecentDishesCache, saveRecentDishesCache,
  getRecentDishIds, loadSessions, loadDishesBySession,
} from '../utils/database';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard from '../components/ui/PaperCard';
import SectionHeader from '../components/ui/SectionHeader';
import MetaChip from '../components/ui/MetaChip';

// ── Assets ────────────────────────────────────────────────────────────────────
const ASSETS = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const scoreColor = (score) => {
  const p = score * 100;
  if (p >= 85) return C.accentGreen || '#4A7C59';
  if (p >= 70) return C.accentGold || '#C8860A';
  return C.textSecondary || '#A0784A';
};

const LOADING_MSGS = [
  'Đang tìm món ngon cho bạn...',
  'Phân tích thời tiết hôm nay...',
  'Chọn món phù hợp khẩu vị...',
  'Sắp có gợi ý rồi nhé! 🍜',
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
          <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, padding: 20, alignItems: 'center' }}>
            <Text style={s.loadingText}>{LOADING_MSGS[idx]}</Text>
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
const TopCard = ({ item, onPress }) => {
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
            <Text style={s.topTitle} numberOfLines={2}>{item.title}</Text>
            <View style={s.chipRow}>
              <MetaChip icon={<Ionicons name="time-outline" size={11} />} label={`${item.cook_time_min}p`} />
              <MetaChip variant="accent" icon={<Ionicons name="star" size={11} />} label={`${(item.final_score * 100).toFixed(0)}%`} />
              {item.nation && (
                <MetaChip label={item.nation} />
              )}
            </View>
            {item.explanation?.[0] && (
              <Text style={s.topHint} numberOfLines={2}>{item.explanation[0]}</Text>
            )}
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

// ── List row (rank 4+) ────────────────────────────────────────────────────────
const ListRow = ({ item, onPress }) => (
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
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' }}>
            <Text style={s.rowMeta}>
              <Ionicons name="time-outline" size={11} /> {item.cook_time_min}p
            </Text>
            <Text style={[s.rowMeta, { color: scoreColor(item.final_score), fontFamily: 'Nunito_700Bold' }]}>
              <Ionicons name="star" size={11} /> {(item.final_score * 100).toFixed(0)}%
            </Text>
            {item.nation && <Text style={s.rowMeta}>{item.nation}</Text>}
          </View>
          {item.explanation?.[0] && (
            <Text style={s.rowHint} numberOfLines={1}>{item.explanation[0]}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={C.textLight} style={{ paddingRight: 12 }} />
      </View>
    </ImageBackground>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
const RecommendScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { searchParams } = route.params || {};
  const [dishes, setDishes]        = useState([]);
  const [isLoading, setIsLoading]  = useState(true);
  const [visibleCount, setVisible] = useState(10);
  const [error, setError]          = useState(null);
  const { setCurrentSessionId }    = useAppStore();

  useEffect(() => { fetchRecommendations(); }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true); setError(null);
    try {
      const recentDishIds = await getRecentDishIds(3);
      const res = await api.post('/api/v1/recommend', { ...searchParams, recent_dish_ids: recentDishIds });
      const ranked = res.data.ranked_dishes || [];
      setDishes(ranked);
      await saveRecentDishesCache(ranked);
      await persistSession(res.data, searchParams);
    } catch {
      const cached = await loadRecentDishesCache();
      if (cached.length) { setDishes(cached); setError('offline'); }
      else {
        const sessions = await loadSessions(1);
        if (sessions.length) { setDishes(await loadDishesBySession(sessions[0].id)); setError('offline'); }
        else setError('empty');
      }
    } finally { setIsLoading(false); }
  };

  const persistSession = async (result, params) => {
    try {
      const sid = await saveSession({
        created_at: new Date().toISOString(),
        lat: params.lat, lon: params.lon,
        province: params.location?.province || '',
        cuisine_scope: params.cuisine_scope,
        basket_skipped: params.market_basket?.is_skipped ? 1 : 0,
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

  const weather = searchParams?.weather;
  const weatherPill = weather ? `${weather.temperature}°C · ${weather.condition || ''}` : null;
  const filterPill = [
    searchParams?.cuisine_scope === 'global' ? '🌍 Toàn cầu' : '🇻🇳 Việt Nam',
    searchParams?.dish_type_filter === 'soup'      ? '🥣 Canh' :
    searchParams?.dish_type_filter === 'main_dish' ? '🍖 Món mặn' : '🍽️ Tất cả',
  ].join(' · ');

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { flexDirection: 'row', alignItems: 'center' }]}>
            <Ionicons name="arrow-back" size={16} color={C.textMid} />
            <Text style={s.backText}> Quay lại</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Gợi ý món ăn</Text>
          <TouchableOpacity onPress={fetchRecommendations} style={[s.refreshBtn, { flexDirection: 'row', alignItems: 'center' }]}>
            <Ionicons name="refresh" size={16} color={C.accentGold} />
            <Text style={s.refreshText}> Làm mới</Text>
          </TouchableOpacity>
        </View>

        {/* Context pills */}
        <View style={s.pillRow}>
          {weatherPill && (
            <MetaChip icon={<Ionicons name="sunny-outline" size={12}/>} label={weatherPill} />
          )}
          <MetaChip label={filterPill} />
          <MetaChip variant="accent" label={`${dishes.length} gợi ý`} />
        </View>
      </ImageBackground>

      {/* ── Offline banner ── */}
      {error === 'offline' && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>📡 Đang hiển thị dữ liệu đã lưu (offline)</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Top 3 horizontal scroll ── */}
        {dishes.length > 0 && (
          <>
            <SectionHeader title="✨ Gợi ý hàng đầu" />

            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12, paddingBottom: 4 }}
            >
              {dishes.slice(0, 3).map(item => (
                <TopCard
                  key={item.dish_id || item.rank}
                  item={item}
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
            {dishes.slice(3, visibleCount).map(item => (
              <ListRow
                key={item.dish_id || item.rank}
                item={item}
                onPress={() => navigation.navigate('DishDetail', { dish: item })}
              />
            ))}

            {visibleCount < dishes.length && (
              <TouchableOpacity onPress={() => setVisible(dishes.length)} activeOpacity={0.80}>
                <ImageBackground source={ASSETS.paper} style={s.loadMoreBtn} imageStyle={{ borderRadius: 18, opacity: 0.85 }} resizeMode="cover">
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 18, paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={s.loadMoreText}>
                      Xem thêm {dishes.length - visibleCount} gợi ý ↓
                    </Text>
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
            <TouchableOpacity onPress={fetchRecommendations} activeOpacity={0.80} style={{ marginTop: 20 }}>
              <ImageBackground source={ASSETS.wood} style={s.retryBtn} imageStyle={{ borderRadius: 18, opacity: 0.88 }} resizeMode="cover">
                <View style={{ backgroundColor: 'rgba(92,58,30,0.22)', borderRadius: 18, paddingVertical: 13, paddingHorizontal: 32 }}>
                  <Text style={s.retryText}>Thử lại</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn:    { paddingVertical: 4, paddingRight: 12 },
  backText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: C.textMid,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 17, color: C.text,
  },
  refreshBtn:  { paddingVertical: 4, paddingLeft: 12 },
  refreshText: {
    fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.accentGold,
  },

  // Pills
  pillRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 16, paddingBottom: 12,
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
  loadingText: {
    fontFamily: 'Nunito_700Bold', fontSize: 16,
    color: C.text, textAlign: 'center',
  },

  // Top card
  topCard: {
    width: 220, borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 6,
  },
  topCardFirst: {
    width: 240, borderWidth: 1.5, borderColor: C.border, // Or C.accentGold based on spec
  },
  topCardImg: { borderRadius: 22, opacity: 0.88 },
  topImgWrap: { height: 148, position: 'relative' },
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
  topBody: { padding: 14 },
  topTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 15,
    color: C.text, lineHeight: 20,
  },
  topHint: {
    fontFamily: 'Caveat_400Regular', fontSize: 13,
    color: C.textMid, marginTop: 8, lineHeight: 18,
  },

  // List row
  row: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 3,
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
  rowContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  rowTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.text,
  },
  rowMeta: {
    fontFamily: 'Nunito_400Regular', fontSize: 11, color: C.textMid,
  },
  rowHint: {
    fontFamily: 'Caveat_400Regular', fontSize: 13,
    color: C.textSecondary, marginTop: 3,
  },

  // Load more / retry
  loadMoreBtn: {
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3,
  },
  loadMoreText: {
    fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.text,
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
});

export default RecommendScreen;
