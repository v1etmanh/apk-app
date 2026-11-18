/**
 * ChosenDishScreen.js — "Bữa hôm nay" / Family Meal Plan
 * Hiển thị thực đơn từng thành viên trong gia đình hôm nay.
 * Design: giấy kem + nâu gỗ (Lora + BeVietnamPro), gọn & dễ đọc.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, Platform, StatusBar,
  ImageBackground, Dimensions, Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { useTranslation } from 'react-i18next';
import {
  getMealPlan, removeDishFromMealPlan, resetTodayMealPlan,
  getTodayDateStr, formatDisplayDate,
} from '../services/mealPlanService';
import { formatVnd, hasPrice } from '../utils/price';

const langOf = (i18n) => ((i18n?.language || 'vi').startsWith('en') ? 'en' : 'vi');

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg: '#F6EEDD', header: '#FBF5E8', card: '#FFFAF0', row: '#FBF5E8',
  border: '#E4D3B0', rowBorder: '#EADDBE',
  ink: '#3D2B1F', muted: '#7A6448', brown: '#5C3A1E', accent: '#7A4E24',
  cream: '#FFF8EA', dashed: '#C8A96E',
  // Giống HistoryScreen: hero trời + nền giấy
  sky: '#A8CEDF', paper: '#F5EDD6',
};

// 2 ảnh như History: 1 hero (trời màu nước) + 1 nền (giấy kem)
const TEX = {
  sky:   require('../assets/textures/sky_watercolor.png'),
  paper: require('../assets/textures/paper_cream.png'),
};
const CAT = require('../assets/animations/Dance cat.json');
const { width: SW } = Dimensions.get('window');
// Sóng tuần hoàn (chu kỳ = SW/waves) vẽ dài gấp đôi màn hình → trượt ngang -SW là lặp liền mạch
const WAVE_H = 22;
const wavePath = (waves, amp) => {
  const half = SW / (waves * 2);
  const mid = WAVE_H / 2;
  let d = `M0,${mid}`;
  for (let i = 0; i < waves * 4; i++) {
    const x = i * half;
    const cy = i % 2 === 0 ? mid + amp : mid - amp;
    d += ` Q${x + half / 2},${cy} ${x + half},${mid}`;
  }
  return `${d} L${SW * 2},${WAVE_H} L0,${WAVE_H} Z`;
};
const WAVE_BACK  = wavePath(2, 9);
const WAVE_FRONT = wavePath(3, 6); // số sóng phải là số nguyên để vòng lặp không bị giật

// ── Mép gợn sóng chuyển động — 2 lớp trượt ngược chiều, khác tốc độ ─────────
const WaveLayer = ({ d, opacity, duration, reverse }) => {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(x, { toValue: 1, duration, easing: t => t, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [x, duration]);
  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [-SW, 0] : [0, -SW],
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { width: SW * 2, transform: [{ translateX }] }]}>
      <Svg width={SW * 2} height={WAVE_H}>
        <Path d={d} fill={P.paper} fillOpacity={opacity} />
      </Svg>
    </Animated.View>
  );
};

const MovingWave = () => (
  <View pointerEvents="none" style={s.wave}>
    <WaveLayer d={WAVE_BACK}  opacity={0.55} duration={9000} reverse />
    <WaveLayer d={WAVE_FRONT} opacity={1}    duration={6000} />
  </View>
);

// Tông avatar xoay vòng theo thứ tự thành viên
const TONES = [
  { bg: '#E9DDBF', ring: '#8B5E3C', ink: '#5C3A1E' },
  { bg: '#DCE6EE', ring: '#5E7C94', ink: '#34506A' },
  { bg: '#F3DDD3', ring: '#B0705A', ink: '#7A3F2B' },
  { bg: '#DCE8C8', ring: '#6B8A4E', ink: '#3F5A2B' },
];
const THUMB_TONES = ['#EBD3B0', '#D9E3C2', '#F0D9B8'];

const nativeShadow = (color = '#8B5E3C', opacity = 0.12, radius = 12, offset = { width: 0, height: 6 }, elevation = 3) =>
  Platform.select({
    ios:     { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: offset },
    android: { elevation },
  });


// ── Mèo trên hero — nhấp nhô + lắc nhẹ giống HistoryScreen ─────────────────
const HeroCat = () => {
  const bob    = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: -7, duration: 1000, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0,  duration: 1000, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(wiggle, { toValue: 1,  duration: 1800, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 1800, useNativeDriver: true }),
      ])),
    ]);
    anim.start();
    return () => anim.stop();
  }, [bob, wiggle]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[s.catWrap, {
        transform: [
          { translateY: bob },
          { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) },
        ],
      }]}
    >
      <LottieView source={CAT} autoPlay loop style={s.cat} />
    </Animated.View>
  );
};

// ── DishRow — mỗi món trong thẻ thành viên ───────────────────────────────────
const DishRow = ({ dish, index, profileId, onRemove, onPress }) => {
  const { t, i18n } = useTranslation();
  const price = formatVnd(dish.est_cost_vnd, langOf(i18n));
  const hasMetaBefore = dish.cook_time_min > 0 || !!dish.nation;
  return (
    <TouchableOpacity style={dp.wrap} onPress={onPress} activeOpacity={0.78}>
      {dish.image_url ? (
        <Image source={{ uri: dish.image_url }} style={dp.thumb} resizeMode="cover" />
      ) : (
        <View style={[dp.thumb, dp.placeholder, { backgroundColor: THUMB_TONES[index % THUMB_TONES.length] }]}>
          <Ionicons name="restaurant-outline" size={26} color="#8B5E3C" />
        </View>
      )}

      <View style={dp.info}>
        <Text style={dp.title} numberOfLines={2}>{dish.title}</Text>
        <View style={dp.metaRow}>
          {dish.cook_time_min > 0 && (
            <>
              <Ionicons name="time-outline" size={13} color={P.muted} />
              <Text style={dp.meta}>{t('today.minutes', { count: dish.cook_time_min })}</Text>
            </>
          )}
          {dish.nation ? <Text style={dp.meta} numberOfLines={1}>{dish.cook_time_min > 0 ? ' · ' : ''}{dish.nation}</Text> : null}
          {price ? (
            <Text style={[dp.meta, dp.price]} numberOfLines={1}>
              {hasMetaBefore ? ' · ' : ''}{t('price.perServing', { price })}
            </Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); onRemove(profileId, dish.dish_id); }}
        style={dp.removeBtn}
        accessibilityRole="button"
        accessibilityLabel={t('today.removeDish', { name: dish.title })}
      >
        <Ionicons name="close" size={20} color={P.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ── ProfileCard — thẻ cho từng thành viên ────────────────────────────────────
const ProfileCard = ({ entry, tone, onRemoveDish, onAddDish, onPressDish }) => {
  const { t } = useTranslation();
  const name = entry.displayName || t('profiles.unnamed');
  const hasDishes = entry.dishes.length > 0;
  // Hồ sơ mới nhất trong store, để avatar đổi ngay khi sửa năm sinh/giới tính.
  const member = useAppStore(st => st.profiles.find(p => p.profileId === entry.profileId));
  return (
    <View style={[s.card, nativeShadow()]}>
      {/* Header thành viên */}
      <View style={s.profileHeader}>
        <View style={[s.avatarWrap, { backgroundColor: tone.bg, borderColor: tone.ring }]}>
          <ProfileAvatar profile={member || entry} size={38} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.profileName} numberOfLines={1}>{name}</Text>
          <Text style={s.profileRelation}>{t(`profiles.${entry.relation}`, { defaultValue: t('profiles.other') })}</Text>
        </View>
        <View style={[s.countBadge, !hasDishes && s.countBadgeEmpty]}>
          <Text style={[s.countText, !hasDishes && s.countTextEmpty]}>
            {hasDishes ? t('common.dishes', { count: entry.dishes.length }) : t('today.noDishChip')}
          </Text>
        </View>
      </View>

      {/* Danh sách món */}
      {hasDishes && (
        <View style={{ marginTop: 12 }}>
          {entry.dishes.map((dish, i) => (
            <DishRow
              key={dish.dish_id}
              dish={dish}
              index={i}
              profileId={entry.profileId}
              onRemove={onRemoveDish}
              onPress={() => onPressDish(dish)}
            />
          ))}
        </View>
      )}

      {/* Nút thêm / gợi ý */}
      {hasDishes ? (
        <TouchableOpacity style={s.addBtn} onPress={() => onAddDish(entry.profileId)} activeOpacity={0.75}>
          <Ionicons name="add" size={18} color={P.accent} />
          <Text style={s.addBtnText}>{t('today.addFor', { name })}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.suggestBtn} onPress={() => onAddDish(entry.profileId)} activeOpacity={0.82}>
          <Ionicons name="add" size={18} color={P.cream} />
          <Text style={s.suggestBtnText}>{t('today.suggestFor', { name })}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ onGoRecommend }) => {
  const { t } = useTranslation();
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <Ionicons name="restaurant-outline" size={34} color="#8B5E3C" />
      </View>
      <Text style={s.emptyTitle}>{t('today.emptyTitle')}</Text>
      <Text style={s.emptyBody}>{t('today.emptyBody')}</Text>
      <TouchableOpacity style={s.ctaPrimary} onPress={onGoRecommend} activeOpacity={0.85}>
        <Text style={s.ctaText}>{t('today.seeRecommendations')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Stat tile (header) ───────────────────────────────────────────────────────
const Stat = ({ value, label, warn }) => (
  <View style={s.stat}>
    <Text style={[s.statValue, warn && { color: '#8A4B1F' }]}>{value}</Text>
    <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const ChosenDishScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profiles, activeProfileId, switchProfile } = useAppStore();

  const [plan, setPlan]       = useState({ date: getTodayDateStr(), items: [] });
  const [loading, setLoading] = useState(true);

  // ── Load plan mỗi khi screen được focus ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        const p = await getMealPlan();
        if (active) { setPlan(p); setLoading(false); }
      })();
      return () => { active = false; };
    }, [])
  );

  const handlePressDish = useCallback((dish) => {
    navigation.navigate('DishDetail', { dish });
  }, [navigation]);

  const handleRemoveDish = useCallback(async (profileId, dishId) => {
    const updated = await removeDishFromMealPlan(profileId, dishId);
    setPlan({ ...updated });
  }, []);

  // Thêm món → switch profile đó active → navigate Recommend
  const handleAddDish = useCallback(async (profileId) => {
    if (profileId !== activeProfileId) {
      await switchProfile(profileId);
    }
    navigation.navigate('Recommend');
  }, [activeProfileId, switchProfile, navigation]);

  const handleReset = () => {
    Alert.alert(
      t('today.reset'),
      t('today.noDishBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearAll'), style: 'destructive',
          onPress: async () => {
            await resetTodayMealPlan();
            setPlan({ date: getTodayDateStr(), items: [] });
          },
        },
      ]
    );
  };

  const handleMarketBasket = () => {
    const allDishes = plan.items.flatMap(i => i.dishes);
    if (allDishes.length === 0) {
      Alert.alert(t('today.noDishTitle'), t('today.noDishBody'));
      return;
    }
    navigation.navigate('MarketBasket', { fromMealPlan: true, dishes: allDishes });
  };

  // Gộp: thành viên có món + thành viên chưa có món (thẻ rỗng)
  const emptyEntries = profiles
    .filter(p => !plan.items.some(i => i.profileId === p.profileId))
    .map(p => ({ profileId: p.profileId, displayName: p.displayName, avatar: p.avatar, relation: p.relation, dishes: [] }));
  const entries = [...plan.items, ...emptyEntries];

  const totalDishes = plan.items.reduce((sum, i) => sum + i.dishes.length, 0);
  const withoutDish = entries.filter(e => e.dishes.length === 0).length;
  // Mỗi thành viên ăn 1 phần mỗi món của mình → tổng = cộng giá mọi món trong plan.
  // Món cũ (thêm trước khi có dữ liệu giá) không có est_cost_vnd thì bỏ qua.
  const pricedDishes = plan.items.flatMap(i => i.dishes).filter(d => hasPrice(d.est_cost_vnd));
  const estTotal = pricedDishes.reduce((sum, d) => sum + d.est_cost_vnd, 0);
  const estTotalLabel = pricedDishes.length ? `~${formatVnd(estTotal, langOf(i18n))}` : null;
  const displayDate = formatDisplayDate(plan.date, langOf(i18n));

  return (
    <ImageBackground source={TEX.paper} style={s.root} resizeMode="cover">
      <StatusBar barStyle="dark-content" />

      {/* ── Header (hero trời + mép gợn sóng) ── */}
      <ImageBackground
        source={TEX.sky}
        style={s.hero}
        resizeMode="cover"
        imageStyle={{ opacity: 0.55 }}
      >
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerDate}>{displayDate}</Text>
            <Text style={s.headerTitle}>{t('today.title')}</Text>
          </View>
          <HeroCat />
          {plan.items.length > 0 && (
            <TouchableOpacity
              onPress={handleReset}
              style={s.resetBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('today.reset')}
            >
              <Ionicons name="trash-outline" size={20} color={P.muted} />
            </TouchableOpacity>
          )}
        </View>

        {entries.length > 0 && (
          <View style={s.statsRow}>
            {estTotalLabel
              ? <Stat value={estTotalLabel} label={t('today.estTotal')} />
              : <Stat value={entries.length} label={t('today.members')} />}
            <Stat value={totalDishes} label={t('today.chosenDishes')} />
            <Stat value={withoutDish} label={t('today.noDishYet')} warn={withoutDish > 0} />
          </View>
        )}
      </View>
        <MovingWave />
      </ImageBackground>

      {/* ── Body ── */}
      {loading ? (
        <View style={s.centerFlex}>
          <Text style={s.loadingText}>{t('today.loading')}</Text>
        </View>
      ) : plan.items.length === 0 ? (
        <EmptyState onGoRecommend={() => navigation.navigate('Recommend')} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 }}
        >
          {entries.map((entry, i) => (
            <View key={entry.profileId} style={{ marginBottom: 16 }}>
              <ProfileCard
                entry={entry}
                tone={TONES[i % TONES.length]}
                onRemoveDish={handleRemoveDish}
                onAddDish={handleAddDish}
                onPressDish={handlePressDish}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Footer CTA: Tổng hợp nguyên liệu ── */}
      {totalDishes > 0 && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity style={[s.ctaPrimary, s.ctaFooter, nativeShadow(P.brown, 0.28, 12, { width: 0, height: 6 }, 6)]} onPress={handleMarketBasket} activeOpacity={0.85}>
            <Ionicons name="basket-outline" size={22} color={P.cream} />
            <Text style={s.ctaText}>{t('today.combine', { count: totalDishes })}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ImageBackground>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.paper },

  // Header
  hero: { backgroundColor: P.sky },
  header: {
    paddingHorizontal: 20, paddingBottom: 16, gap: 14,
  },
  wave: { marginTop: -1, width: SW, height: WAVE_H, overflow: 'hidden' },
  catWrap: { width: 84, height: 84, marginTop: -14, marginBottom: -12 },
  cat: { width: 84, height: 84 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerDate: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13, color: P.muted, letterSpacing: 0.2 },
  headerTitle: { fontFamily: 'Lora-Bold', fontSize: 28, lineHeight: 34, color: P.ink },
  resetBtn: {
    width: 44, height: 44, borderRadius: 14,
    borderWidth: 1, borderColor: P.border, backgroundColor: P.card,
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1, backgroundColor: P.card,
    borderWidth: 1, borderColor: P.border, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 2,
  },
  statValue: { fontFamily: 'Lora-Bold', fontSize: 22, lineHeight: 26, color: P.ink },
  statLabel: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: P.muted },

  // Member card
  card: {
    backgroundColor: P.card, borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: P.border,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  profileName: { fontFamily: 'Lora-Bold', fontSize: 17, color: P.ink },
  profileRelation: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: P.muted, marginTop: 1 },
  countBadge: { backgroundColor: '#E7EFD9', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  countBadgeEmpty: { backgroundColor: '#F5E6D0' },
  countText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 12, color: '#3F5A2B' },
  countTextEmpty: { color: '#8A4B1F' },

  // Buttons in card
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 4, minHeight: 44, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.dashed,
  },
  addBtnText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 14, color: P.accent },
  suggestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, minHeight: 48, borderRadius: 14, backgroundColor: P.brown,
  },
  suggestBtnText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 14, color: P.cream },

  // Empty state
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#EBD3B0',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: 'Lora-Bold', fontSize: 20, color: P.ink, textAlign: 'center', marginBottom: 10 },
  emptyBody: { fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: P.muted, textAlign: 'center', lineHeight: 22 },

  // CTA
  ctaPrimary: {
    marginTop: 24, minHeight: 56, borderRadius: 18, backgroundColor: P.brown,
    paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaFooter: { marginTop: 0 },
  ctaText: { color: P.cream, fontSize: 16, fontFamily: 'BeVietnamPro-Bold' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: P.border, backgroundColor: P.header,
  },

  // Loading / center
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 15, color: P.muted },
});

// ── DishRow styles ────────────────────────────────────────────────────────────
const dp = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: P.row, borderRadius: 16, borderWidth: 1, borderColor: P.rowBorder,
    paddingLeft: 8, paddingVertical: 8, paddingRight: 2, marginBottom: 8,
  },
  thumb: { width: 56, height: 56, borderRadius: 14 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  title: { fontFamily: 'BeVietnamPro-Bold', fontSize: 15, lineHeight: 19, color: P.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: P.muted, flexShrink: 1 },
  price: { fontFamily: 'BeVietnamPro-SemiBold', color: P.accent },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default ChosenDishScreen;
