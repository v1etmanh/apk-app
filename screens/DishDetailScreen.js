import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Animated, ImageBackground, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { loadSessions } from '../utils/database';
import SegmentTabs, { TabPanel } from '../components/ui/SegmentTabs';
import { C, shadow } from '../theme';
import PaperCard from '../components/ui/PaperCard';
import SectionHeader from '../components/ui/SectionHeader';
import ScreenBackground from '../components/ui/ScreenBackground';
import { useTranslation } from 'react-i18next';
import { formatVnd } from '../utils/price';
import WhyThisDish from '../components/WhyThisDish';
import { hasWhy } from '../utils/whyText';
import IngredientThumb from '../components/ui/IngredientThumb';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 320;

const ASSETS = {
  paper: require('../assets/textures/paper_cream.png'),
};

const TABS = [
  { key: 'pantry', icon: 'basket-outline',     label: 'dish.tabPantry' },
  { key: 'why',    icon: 'sparkles-outline',   label: 'dish.tabWhy' },
  { key: 'serve',  icon: 'restaurant-outline', label: 'dish.tabServe' },
];

/** Nút nhỏ trên thanh đáy: icon + nhãn, hiện spinner khi đang gửi. */
const BarAction = ({ icon, color, label, state, disabled, onPress }) => (
  <TouchableOpacity
    style={[s.barAction, state === 'done' && { opacity: 0.75 }]}
    activeOpacity={0.7}
    disabled={disabled}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {state === 'loading'
      ? <ActivityIndicator size="small" color={color} />
      : <Ionicons name={icon} size={21} color={state === 'error' ? C.accentRed : color} />}
    <Text style={[s.barLabel, { color }]} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>
);

/** Ô thông số trong tab Thông tin cơ bản: icon + nhãn nhỏ + giá trị. */
const InfoTile = ({ icon, color, label, value, accent }) => (
  <View style={[s.infoTile, accent && s.infoTileAccent]}>
    <View style={s.infoHead}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={s.infoLabel} numberOfLines={1}>{label}</Text>
    </View>
    <Text style={[s.infoValue, accent && { color: C.freshText }]} numberOfLines={1}>{value}</Text>
  </View>
);

const DishDetailScreen = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  const priceLang = (i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi';
  const { dish: initialDish, pickedIds = [] } = route.params;
  const pickedSet = new Set(pickedIds.map(Number));
  const [dish, setDish] = useState(initialDish);
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [ingredients, setIngredients]               = useState([]);
  const [loadingDetail, setLoadingDetail]           = useState(true);
  const [feedbackState, setFeedbackState]           = useState({}); // { eaten: 'loading'|'done'|'error' }
  const [dishUrl, setDishUrl]                       = useState(dish.url || ''); // fallback cho url từ API
  const [tab, setTab]                               = useState(0);
  useEffect(() => { loadDetail(); }, []);

  const loadDetail = async () => {
    try {
      const dishId = dish.dish_id || dish.id;
      if (!dishId) return;
      const res = await api.get(`/api/v1/dishes/${dishId}`);
      setDish(prev => ({ ...prev, ...res.data }));
      setIngredients(res.data.ingredients || []);
      // Nếu dish trong params (từ meal plan cũ) không có url → lấy từ API
      if (!dishUrl && res.data.url) {
        setDishUrl(res.data.url);
      }
    } catch (e) { console.error('loadDetail:', e); }
    finally { setLoadingDetail(false); }
  };

  const handleFeedback = async (action) => {
    const dishId = dish.dish_id || dish.id;
    setFeedbackState(prev => ({ ...prev, [action]: 'loading' }));
    try {
      // Lấy session_uuid từ local storage (nếu có)
      let sessionUuid = '';
      try {
        const sessions = await loadSessions(1);
        if (sessions.length > 0) sessionUuid = String(sessions[0].id);
      } catch (_) {}

      await api.post('/api/v1/feedback', {
        session_uuid: sessionUuid,
        dish_id:      String(dishId),
        action,
        feedback_at:  new Date().toISOString(),
      });

      setFeedbackState(prev => ({ ...prev, [action]: 'done' }));
    } catch (e) {
      console.error('handleFeedback:', e);
      setFeedbackState(prev => ({ ...prev, [action]: 'error' }));
      // Reset error sau 2s để user có thể thử lại
      setTimeout(() => setFeedbackState(prev => ({ ...prev, [action]: undefined })), 2000);
    }
  };

  // match_pct: điểm tương đối so với món tốt nhất của lần gợi ý (server mới); dữ liệu cũ dùng final_score
  const matchPct = dish.match_pct ?? Math.round((dish.final_score || 0) * 100);
  const missingIngredients = Array.isArray(dish.missing_ingredients) ? dish.missing_ingredients : [];
  const mainIngredients = ingredients.filter(i => i.is_main);
  const sideIngredients = ingredients.filter(i => !i.is_main);
  const hasWhyContent = hasWhy(dish.why)
    || (Array.isArray(dish.explanation) ? !!dish.explanation[0] : !!dish.explanation?.headline);

  const openCooking = () => navigation.navigate('CookingSteps', {
    dishId: dish.dish_id || dish.id,
    dish,
    dishUrl,
  });

  // Header Animations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 100, HERO_HEIGHT - 50],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  
  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: 'clamp',
  });

  return (
    <ImageBackground 
      source={ASSETS.paper} 
      style={s.container} 
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* ── Floating Header ────────────────────────────────────────── */}
      <Animated.View style={[s.floatingHeader, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
        <ImageBackground source={ASSETS.paper} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.95 }} resizeMode="cover" />
        <View style={s.headerInner}>
          <Text style={s.headerTitle} numberOfLines={1}>{dish.title}</Text>
        </View>
      </Animated.View>
      
      {/* Back Button Overlay */}
      <TouchableOpacity 
        style={[s.backBtnOverlay, { top: insets.top + 8 }]} 
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <View style={s.backBtnBlur}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </View>
      </TouchableOpacity>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: 110 + insets.bottom }
        ]}
        style={s.scrollView}
      >
        {/* ── Hero Parallax ────────────────────────────────────────── */}
        <Animated.View style={[s.heroContainer, { transform: [{ scale: heroScale }] }]}>
          {dish.image_url ? (
            <Image source={{ uri: dish.image_url }} style={s.heroImage} resizeMode="cover" />
          ) : (
            <View style={[s.heroImage, { backgroundColor: C.surfaceAlt, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 80 }}>🍜</Text>
            </View>
          )}
          {/* Gradient Overlay for text readability */}
          <View style={s.heroGradient} />
        </Animated.View>

        {/* ── Content ──────────────────────────────────────────────── */}
        <View style={s.contentContainer}>
          
          {/* ── Title & Meta Stats Card ── */}
          <View style={s.titleCard}>
            <ImageBackground source={ASSETS.paper} style={s.titleCardBg} imageStyle={{ borderRadius: 24, opacity: 0.95 }} resizeMode="cover">
              <View style={s.titleCardInner}>
                <Text style={[s.mainTitle, { marginBottom: 0 }]}>{dish.title}</Text>
              </View>
            </ImageBackground>
          </View>

          {/* ── 3 tab: Nguyên liệu · Vì sao hợp · Thông tin cơ bản ── */}
          <SegmentTabs
            value={tab}
            onChange={setTab}
            style={{ marginBottom: 18 }}
            items={TABS.map((tb) => ({
              key: tb.key,
              label: t(tb.label),
              icon: (c) => <Ionicons name={tb.icon} size={14} color={c} />,
            }))}
          />

          <TabPanel id={tab}>
          {tab === 0 && (
              <View style={s.section}>
            
                {loadingDetail ? (
                  <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
                ) : ingredients.length === 0 ? (
                  <View style={s.emptyState}>
                    <Ionicons name="fast-food-outline" size={32} color={C.border} />
                    <Text style={s.emptyText}>{t('dish.noIngredients')}</Text>
                  </View>
                ) : (
                  <View style={s.pantryContainer}>
                    {missingIngredients.length > 0 && (
                      <View style={s.needBuy}>
                        <Ionicons name="cart-outline" size={16} color={C.seasonText} />
                        <Text style={s.needBuyText}>{t('dish.needToBuy', { list: missingIngredients.join(', ') })}</Text>
                      </View>
                    )}
                    {mainIngredients.length > 0 && (
                      <View style={s.pantryGroup}>
                        <Text style={s.pantryTitle}>{t('dish.mainIngredients')}</Text>
                        <View style={s.ingGrid}>
                          {mainIngredients.map(ing => (
                            <View key={ing.id} style={[s.ingChipMain, pickedSet.has(Number(ing.id)) && s.ingChipHave]}>
                              <IngredientThumb id={ing.id} category={ing.category} size={64} />
                              <Text style={[s.ingTextMain, pickedSet.has(Number(ing.id)) && s.ingTextHave]} numberOfLines={2}>
                                {pickedSet.has(Number(ing.id)) ? '✓ ' : ''}{ing.name}
                              </Text>
                              {ing.quantity_g > 0 && (
                                <View style={s.ingQtyBadge}>
                                  <Text style={s.ingQtyText}>{ing.quantity_g}g</Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                
                    {sideIngredients.length > 0 && (
                      <View style={[s.pantryGroup, { marginTop: 16 }]}>
                        <Text style={s.pantryTitle}>{t('dish.sides')}</Text>
                        <View style={s.ingGrid}>
                          {sideIngredients.map(ing => (
                            <View key={ing.id} style={[s.ingChipSide, pickedSet.has(Number(ing.id)) && s.ingChipHave]}>
                              <Text style={[s.ingTextSide, pickedSet.has(Number(ing.id)) && s.ingTextHave]}>
                                {pickedSet.has(Number(ing.id)) ? '✓ ' : ''}{ing.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

          )}

          {tab === 1 && (
            hasWhyContent
              ? <WhyThisDish why={dish.why} explanation={dish.explanation} showHeader={false} />
              : <Text style={s.tabEmpty}>{t('dish.noWhy')}</Text>
          )}

          {tab === 2 && (
            <View>
              <View style={s.infoGrid}>
                <InfoTile icon="time-outline" color={C.textMid} label={t('dish.infoTime')}
                  value={dish.cook_time_min ? t('recommend.minutes', { count: dish.cook_time_min }) : '—'} />
                <InfoTile icon="earth" color={C.accentBlue} label={t('dish.infoNation')}
                  value={dish.nation || 'Việt Nam'} />
                <InfoTile icon="star" color={C.accentGreen} label={t('dish.infoMatch')}
                  value={`${matchPct}%`} accent />
                <InfoTile icon="wallet-outline" color={C.textMid} label={t('dish.infoPrice')}
                  value={formatVnd(dish.est_cost_vnd, priceLang)
                    ? t('price.perServing', { price: formatVnd(dish.est_cost_vnd, priceLang) })
                    : '—'} />
              </View>
              {!!formatVnd(dish.est_cost_vnd, priceLang) && (
                <Text style={[s.priceNote, { marginBottom: 16 }]}>{t('price.note')}</Text>
              )}

              {dish.serving_suggestion ? (
                <View style={s.section}>
                  <SectionHeader title={t('dish.servingSuggestion')} icon="restaurant-outline" />
                  <PaperCard innerStyle={{ padding: 16 }}>
                    <Text style={s.servingText}>{dish.serving_suggestion}</Text>
                  </PaperCard>
                </View>
              ) : null}

            </View>
          )}
          </TabPanel>
        </View>
      </Animated.ScrollView>

      {/* ── Thanh đáy: Đã ăn · [Nấu ngay] · Bỏ qua ── */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BarAction
          icon={feedbackState.eaten === 'error' ? 'alert-circle-outline' : 'checkmark-done'}
          color={C.inkGreen}
          state={feedbackState.eaten}
          label={feedbackState.eaten === 'done' ? t('dish.saved') : feedbackState.eaten === 'error' ? t('common.error') : t('dish.eaten')}
          disabled={feedbackState.eaten === 'loading' || feedbackState.eaten === 'done'}
          onPress={() => handleFeedback('eaten')}
        />
        <View style={s.cookSlot}>
          <TouchableOpacity
            style={s.cookBtn}
            activeOpacity={0.85}
            onPress={openCooking}
            accessibilityRole="button"
            accessibilityLabel={t('dish.cookNow')}
          >
            <MaterialCommunityIcons name="chef-hat" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.cookLabel}>{t('dish.cookNow')}</Text>
        </View>

        <BarAction
          icon={feedbackState.skipped === 'error' ? 'alert-circle-outline' : feedbackState.skipped === 'done' ? 'checkmark' : 'close'}
          color={C.accentRed}
          state={feedbackState.skipped}
          label={feedbackState.skipped === 'done' ? t('dish.saved') : feedbackState.skipped === 'error' ? t('common.error') : t('dish.skipped')}
          disabled={feedbackState.skipped === 'loading' || feedbackState.skipped === 'done'}
          onPress={() => handleFeedback('skipped')}
        />
      </View>

    </ImageBackground>
  );
};

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: C.bg, 
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
    ...shadow(4),
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerInner: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: C.text,
  },
  
  // Back Button Overlay
  backBtnOverlay: {
    position: 'absolute',
    left: 16,
    zIndex: 101,
    width: 44, height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnBlur: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...shadow(2),
  },

  // Hero Section
  heroContainer: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // In standard RN, we simulate gradient with semi-transparent views if expo-linear-gradient is not imported.
    // We'll use a simple dark overlay at the bottom.
    borderBottomWidth: 60,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    borderTopWidth: 60,
    borderTopColor: 'transparent',
  },

  // Content
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: -40, // Pull up over the hero image
  },

  // Title Card
  titleCard: {
    borderRadius: 24,
    ...shadow(6),
    marginBottom: 16,
  },
  titleCardBg: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  titleCardInner: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  mainTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: C.text,
    lineHeight: 34,
    marginBottom: 16,
  },
  priceNote: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    color: C.textMid,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  needBuy: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 10, borderRadius: 12,
    backgroundColor: C.seasonBg,
  },
  needBuyText: { flex: 1, fontSize: 13, color: C.seasonText, fontFamily: 'BeVietnamPro-SemiBold' },
  ingChipHave: { backgroundColor: C.freshBg, borderColor: '#9FD3B6' },
  ingTextHave: { color: C.freshText },

  // Pantry
  pantryContainer: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  pantryGroup: {
    marginBottom: 8,
  },
  pantryTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: C.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  ingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Nguyên liệu chính: tile ảnh 3 cột (phụ liệu vẫn là chip chữ để không rối)
  ingChipMain: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surface,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(160,120,74,0.3)',
    ...shadow(1),
  },
  ingTextMain: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: C.text,
    textAlign: 'center',
  },
  ingQtyBadge: {
    backgroundColor: 'rgba(160,120,74,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ingQtyText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: C.woodLight || '#A67C52',
  },
  ingChipSide: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  ingTextSide: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: C.textMid,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: C.textLight,
    marginTop: 8,
  },

  // Serving Text
  servingText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: C.text,
    lineHeight: 24,
  },

  // Recipe Button
  // Info tiles (tab Thông tin cơ bản)
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  infoTile: {
    width: '48%', flexGrow: 1, padding: 12, borderRadius: 14,
    backgroundColor: C.parchmentLight, borderWidth: 1, borderColor: C.parchmentDark,
  },
  infoTileAccent: { backgroundColor: C.freshBg, borderColor: '#9FD3B6' },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  infoLabel: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: C.textSoft },
  infoValue: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 16, color: C.text },

  // Tabs (SegmentTabs dùng chung)
  tabEmpty: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: C.textSoft, textAlign: 'center',
    marginVertical: 24, lineHeight: 20,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingHorizontal: 8,
    backgroundColor: C.parchmentLight, borderTopWidth: 1, borderTopColor: C.parchmentDark,
    ...shadow(4),
  },
  barAction: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3, minHeight: 46, paddingBottom: 2 },
  barLabel: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 11 },
  cookSlot: { flex: 1.2, alignItems: 'center', gap: 3, paddingBottom: 2 },
  cookBtn: {
    width: 62, height: 62, borderRadius: 31, marginTop: -30,
    backgroundColor: C.primary, borderWidth: 4, borderColor: C.bg,
    alignItems: 'center', justifyContent: 'center', ...shadow(4),
  },
  cookLabel: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 11, color: C.primary },

});


export default DishDetailScreen;
