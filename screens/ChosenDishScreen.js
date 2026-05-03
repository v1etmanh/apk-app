/**
 * ChosenDishScreen.js — "Bữa hôm nay" / Family Meal Plan
 * Hiển thị thực đơn từng thành viên trong gia đình hôm nay.
 * Design: Ghibli × Storybook Handcrafted (theo design.md)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, Platform,
  StatusBar, ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';

import { useAppStore } from '../store/useAppStore';
import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import {
  getMealPlan, removeDishFromMealPlan, resetTodayMealPlan,
  getTodayDateStr, formatDisplayDate,
} from '../services/mealPlanService';

// ── Assets ────────────────────────────────────────────────────────────────────
const TEX = {
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

// ── Helper: nativeShadow (design.md) ─────────────────────────────────────────
const nativeShadow = (color = '#8B5E3C', opacity = 0.18, radius = 8, offset = { width: 0, height: 4 }, elevation = 5) =>
  Platform.select({
    ios:     { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: offset },
    android: { elevation },
  });

// ── Relation label map ────────────────────────────────────────────────────────
const RELATION_LABEL = {
  self:    'Bản thân',
  child:   'Con',
  parent:  'Cha / Mẹ',
  spouse:  'Vợ / Chồng',
  sibling: 'Anh / Chị / Em',
  other:   'Khác',
};

// ── DishPill — mỗi món nhỏ gọn trong card ────────────────────────────────────
const DishPill = ({ dish, profileId, onRemove, onPress }) => (
  <TouchableOpacity style={dp.wrap} onPress={onPress} activeOpacity={0.78}>
    {/* Texture paper */}
    <View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]} pointerEvents="none">
      <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.6 }} resizeMode="cover" />
    </View>

    {/* Dish thumbnail */}
    {dish.image_url ? (
      <View style={{ borderRadius: 10, overflow: 'hidden', width: 42, height: 42 }}>
        <Image source={{ uri: dish.image_url }} style={{ width: 42, height: 42 }} resizeMode="cover" />
      </View>
    ) : (
      <View style={dp.placeholder}>
        <Text style={{ fontSize: 22 }}>🍜</Text>
      </View>
    )}

    {/* Info */}
    <View style={dp.info}>
      <Text style={dp.title} numberOfLines={1} flexShrink={1}>{dish.title}</Text>
      <Text style={dp.meta} numberOfLines={1}>
        {dish.cook_time_min > 0 ? `⏱ ${dish.cook_time_min}p` : ''}
        {dish.nation ? `  ${dish.nation}` : ''}
      </Text>
      <Text style={dp.hint}>Nhấn để xem cách nấu →</Text>
    </View>

    {/* Remove button */}
    <TouchableOpacity onPress={(e) => { e.stopPropagation(); onRemove(profileId, dish.dish_id); }} style={dp.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={20} color="#C8A96E" />
    </TouchableOpacity>
  </TouchableOpacity>
);

// ── AddDishButton — dashed ghost button (design.md) ──────────────────────────
const AddDishButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={s.addBtn} activeOpacity={0.75}>
    {/* SVG dashed border (design.md: dùng SVG thay borderStyle:'dashed') */}
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Rect x="2" y="2" width="96%" height="88%"
        rx="14" ry="14"
        fill="transparent"
        stroke="#C8A96E"
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
    </Svg>
    <Ionicons name="add-circle-outline" size={16} color="#9A7040" />
    <Text style={s.addBtnText}>Thêm món</Text>
  </TouchableOpacity>
);

// ── ProfileCard — card cho từng thành viên ────────────────────────────────────
const ProfileCard = ({ entry, onRemoveDish, onAddDish, onPressDish }) => (
  /* Shadow wrapper bên ngoài (KHÔNG overflow:hidden) */
  <View style={[s.cardShadow, nativeShadow('#8B5E3C', 0.18, 8, { width: 0, height: 4 }, 5)]}>
    <View style={s.card}>
      {/* Paper texture trong wrapper riêng */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
        <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      {/* Content trên zIndex: 1 */}
      <View style={{ zIndex: 1 }}>
        {/* Profile header */}
        <View style={s.profileHeader}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarEmoji}>{entry.avatar || '🧑'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.profileName} numberOfLines={1}>{entry.displayName || 'Thành viên'}</Text>
            <Text style={s.profileRelation}>{RELATION_LABEL[entry.relation] || entry.relation}</Text>
          </View>
          <View style={s.dishCountBadge}>
            <Text style={s.dishCountText}>{entry.dishes.length} món</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Dish list */}
        {entry.dishes.length > 0
          ? entry.dishes.map(dish => (
              <DishPill
                key={dish.dish_id}
                dish={dish}
                profileId={entry.profileId}
                onRemove={onRemoveDish}
                onPress={() => onPressDish(dish)}
              />
            ))
          : (
            <View style={s.emptyDishRow}>
              <Text style={s.emptyDishText}>Chưa chọn món nào 🍽️</Text>
            </View>
          )
        }

        {/* Add button */}
        <AddDishButton onPress={() => onAddDish(entry.profileId)} />
      </View>
    </View>
  </View>
);

// ── Empty state (chưa có profile nào trong plan) ──────────────────────────────
const EmptyState = ({ onGoRecommend }) => (
  <View style={s.emptyWrap}>
    <Text style={s.emptyEmoji}>🍱</Text>
    <Text style={s.emptyTitle}>Bữa hôm nay trống trải quá!</Text>
    <Text style={s.emptyBody}>
      Mở màn hình gợi ý, chọn món cho từng thành viên{'\n'}rồi quay lại đây nhé~ 😊
    </Text>
    <View style={[s.ctaShadow, nativeShadow('#60A5FA', 0.30, 8, { width: 0, height: 4 }, 6)]}>
      <TouchableOpacity style={s.ctaPrimary} onPress={onGoRecommend} activeOpacity={0.82}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
          <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.45 }} resizeMode="cover" />
        </View>
        <Text style={s.ctaText}>💡 Xem gợi ý món ăn</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const ChosenDishScreen = ({ navigation }) => {
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

  // ── Navigate tới DishDetail ───────────────────────────────────────────────
  const handlePressDish = useCallback((dish) => {
    navigation.navigate('DishDetail', { dish });
  }, [navigation]);

  // ── Xoá món ──────────────────────────────────────────────────────────────
  const handleRemoveDish = useCallback(async (profileId, dishId) => {
    const updated = await removeDishFromMealPlan(profileId, dishId);
    setPlan({ ...updated });
  }, []);

  // ── Thêm món → switch profile đó active → navigate Recommend ─────────────
  const handleAddDish = useCallback(async (profileId) => {
    // Switch active profile nếu cần
    if (profileId !== activeProfileId) {
      await switchProfile(profileId);
    }
    navigation.navigate('recommend');
  }, [activeProfileId, switchProfile, navigation]);

  // ── Reset hôm nay ─────────────────────────────────────────────────────────
  const handleReset = () => {
    Alert.alert(
      'Xoá thực đơn hôm nay?',
      'Tất cả món đã chọn sẽ bị xoá. Bạn có chắc không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá', style: 'destructive',
          onPress: async () => {
            await resetTodayMealPlan();
            setPlan({ date: getTodayDateStr(), items: [] });
          },
        },
      ]
    );
  };

  // ── Tổng hợp nguyên liệu → MarketBasket ──────────────────────────────────
  const handleMarketBasket = () => {
    const allDishes = plan.items.flatMap(i => i.dishes);
    if (allDishes.length === 0) {
      Alert.alert('Chưa có món nào', 'Thêm ít nhất 1 món trước khi tổng hợp nguyên liệu nhé!');
      return;
    }
    navigation.navigate('MarketBasket', { fromMealPlan: true, dishes: allDishes });
  };

  const totalDishes = plan.items.reduce((sum, i) => sum + i.dishes.length, 0);
  const displayDate = formatDisplayDate(plan.date);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenBackground texture="sky" edges={['bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <ImageBackground
        source={TEX.paper}
        style={[s.header, { paddingTop: insets.top + 8 }]}
        imageStyle={{ opacity: 0.92 }}
        resizeMode="cover"
      >
        {/* Row 1: title + reset */}
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>🍱 Bữa hôm nay</Text>
            <Text style={s.headerDate}>{displayDate}</Text>
          </View>
          {plan.items.length > 0 && (
            <TouchableOpacity onPress={handleReset} style={s.resetBtn} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={15} color="#9A7040" />
              <Text style={s.resetText}>Đặt lại</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary pill */}
        {totalDishes > 0 && (
          <View style={s.summaryPill}>
            <Text style={s.summaryText}>
              {plan.items.length} thành viên · {totalDishes} món
            </Text>
          </View>
        )}
      </ImageBackground>

      {/* ── Body ── */}
      {loading ? (
        <View style={s.centerFlex}>
          <Text style={s.loadingText}>Đang tải thực đơn... 🍳</Text>
        </View>
      ) : plan.items.length === 0 ? (
        <EmptyState onGoRecommend={() => navigation.navigate('recommend')} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        >
          {/* Profile cards */}
          {plan.items.map(entry => (
            <View key={entry.profileId} style={{ marginBottom: 16 }}>
              <ProfileCard
                entry={entry}
                onRemoveDish={handleRemoveDish}
                onAddDish={handleAddDish}
                onPressDish={handlePressDish}
              />
            </View>
          ))}

          {/* Profiles chưa có trong plan → hiện card rỗng */}
          {profiles
            .filter(p => !plan.items.some(i => i.profileId === p.profileId))
            .map(p => (
              <View key={p.profileId} style={{ marginBottom: 16 }}>
                <ProfileCard
                  entry={{ profileId: p.profileId, displayName: p.displayName, avatar: p.avatar, relation: p.relation, dishes: [] }}
                  onRemoveDish={handleRemoveDish}
                  onAddDish={handleAddDish}
                  onPressDish={handlePressDish}
                />
              </View>
            ))
          }
        </ScrollView>
      )}

      {/* ── Footer CTA: Tổng hợp nguyên liệu ── */}
      {totalDishes > 0 && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          {/* Paper texture trên footer */}
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
            <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.75 }} resizeMode="cover" />
          </View>
          <View style={[s.ctaShadow, nativeShadow('#60A5FA', 0.30, 8, { width: 0, height: 4 }, 6)]}>
            <TouchableOpacity style={s.ctaPrimary} onPress={handleMarketBasket} activeOpacity={0.82}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
                <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.45 }} resizeMode="cover" />
              </View>
              <Text style={s.ctaText}>🛒 Tổng hợp nguyên liệu ({totalDishes} món)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenBackground>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    borderBottomWidth: 1, borderBottomColor: '#C8A96E',
    shadowColor: '#8B5E3C', shadowOpacity: 0.15,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 4, paddingHorizontal: 20, paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: 'Lora-Bold', fontSize: 22, color: '#3D2B1F',
  },
  headerDate: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: '#8B7355', marginTop: 2,
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 14, borderWidth: 1, borderColor: '#C8A96E',
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: 'rgba(245,237,220,0.6)',
  },
  resetText: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 12, color: '#9A7040',
  },
  summaryPill: {
    alignSelf: 'flex-start', marginTop: 8,
    backgroundColor: 'rgba(200,169,110,0.15)',
    borderRadius: 999, borderWidth: 1, borderColor: '#C8A96E',
    paddingHorizontal: 12, paddingVertical: 5,
  },
  summaryText: {
    fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12, color: '#8B5E3C',
  },

  // Profile Card
  cardShadow: { borderRadius: 20 },
  card: {
    borderRadius: 20, backgroundColor: '#F5EDDC',
    padding: 16, borderWidth: 1.5, borderColor: '#C8A96E',
    // KHÔNG overflow:hidden — giữ shadow iOS
  },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 2,
  },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(200,169,110,0.2)',
    borderWidth: 1.5, borderColor: '#C8A96E',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  profileName: {
    fontFamily: 'Lora-Bold', fontSize: 16, color: '#3D2B1F',
  },
  profileRelation: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: '#8B7355', marginTop: 1,
  },
  dishCountBadge: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(74,222,128,0.4)',
    paddingHorizontal: 10, paddingVertical: 4,
  },
  dishCountText: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 11, color: '#22863A',
  },
  divider: {
    height: 1, backgroundColor: 'rgba(200,169,110,0.3)', marginVertical: 12,
  },

  // Empty dish row
  emptyDishRow: {
    alignItems: 'center', paddingVertical: 10,
  },
  emptyDishText: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: '#8B7355',
  },

  // Add dish button
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 10, paddingVertical: 12,
    minHeight: 44, borderRadius: 14,
    backgroundColor: 'rgba(245,237,220,0.5)',
    // SVG dashed border được vẽ bên trong
  },
  addBtnText: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 13, color: '#9A7040',
  },

  // Empty state
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  emptyEmoji:  { fontSize: 60, marginBottom: 16 },
  emptyTitle:  { fontFamily: 'Lora-Bold', fontSize: 20, color: '#3D2B1F', textAlign: 'center', marginBottom: 10 },
  emptyBody:   { fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: '#8B7355', textAlign: 'center', lineHeight: 22 },

  // CTA
  ctaShadow: { borderRadius: 20, marginTop: 24 },
  ctaPrimary: {
    borderRadius: 20, paddingVertical: 17, alignItems: 'center',
    backgroundColor: '#60A5FA', borderWidth: 2, borderColor: '#3B82F6',
  },
  ctaText: {
    color: '#fff', fontSize: 16, fontFamily: 'Lora-Bold', zIndex: 1,
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#C8A96E',
    backgroundColor: 'rgba(245,237,220,0.92)',
  },

  // Loading / center
  centerFlex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontFamily: 'BeVietnamPro-Regular', fontSize: 15, color: '#8B7355' },
});

// ── DishPill styles ───────────────────────────────────────────────────────────
const dp = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, borderColor: '#C8A96E',
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    backgroundColor: 'rgba(245,237,220,0.5)',
    // KHÔNG overflow:hidden
  },
  placeholder: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(200,169,110,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1 },
  title: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 14, color: '#3D2B1F',
    flexShrink: 1, flexWrap: 'wrap',
  },
  meta: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 11, color: '#8B7355', marginTop: 2,
  },
  hint: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 10, color: '#C8A96E',
    marginTop: 3, fontStyle: 'italic',
  },
  removeBtn: { padding: 2 },
});

export default ChosenDishScreen;
