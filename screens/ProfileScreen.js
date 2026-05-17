/**
 * ProfileScreen.js — Hồ sơ cá nhân
 * Design: Ghibli × Storybook Handcrafted (design.md)
 * Font: Lora (display) + BeVietnamPro (body)
 * Texture: wood_light + paper_cream
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ImageBackground, Platform, Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { deleteProfileMember } from '../utils/database';
import { removeMealPlanByProfileId } from '../services/mealPlanService';

// ── Assets ────────────────────────────────────────────────────────────────────
const TEX = {
  paper: require('../assets/textures/paper_cream.png'),
  wood:  require('../assets/textures/wood_light.png'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const nativeShadow = (
  color = '#8B5E3C', opacity = 0.18,
  radius = 8, offset = { width: 0, height: 4 }, elevation = 5,
) =>
  Platform.select({
    ios:     { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: offset },
    android: { elevation },
  });

// ── Label maps ────────────────────────────────────────────────────────────────
const DIET_LABEL = {
  omnivore: 'Ăn tất cả', vegetarian: 'Chay',
  vegan: 'Thuần chay', pescatarian: 'Ăn cá',
};
const ACTIVITY_LABEL = {
  sedentary: 'Ít vận động', lightly_active: 'Nhẹ nhàng',
  moderately_active: 'Vừa phải', very_active: 'Nhiều vận động',
};
const RELATION_LABEL = {
  self: 'Bản thân', child: 'Con', parent: 'Cha / Mẹ',
  spouse: 'Vợ / Chồng', sibling: 'Anh / Chị / Em', other: 'Khác',
};

// ── WigglyFrame — khung SVG vẽ tay ──────────────────────────────────────────
const WigglyFrame = ({ size = 110, color = '#C8A96E', strokeWidth = 2.2, children }) => {
  const w = size, h = size, s = 9;
  const path = `
    M ${s},${s * 0.6}
    Q ${w * 0.25},${-s * 0.3} ${w * 0.5},${s * 0.4}
    Q ${w * 0.75},${s * 1.1} ${w - s},${s * 0.7}
    Q ${w + s * 0.4},${h * 0.25} ${w - s * 0.6},${h * 0.5}
    Q ${w + s * 0.5},${h * 0.75} ${w - s},${h - s * 0.8}
    Q ${w * 0.75},${h + s * 0.4} ${w * 0.5},${h - s * 0.6}
    Q ${w * 0.25},${h + s * 0.3} ${s},${h - s * 0.7}
    Q ${-s * 0.4},${h * 0.75} ${s * 0.7},${h * 0.5}
    Q ${-s * 0.5},${h * 0.25} ${s},${s * 0.6} Z
  `;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Path d={path} fill="rgba(245,237,220,0.9)" stroke={color} strokeWidth={strokeWidth} />
      </Svg>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
};

// ── HeroAvatar — avatar trung tâm Ghibli ─────────────────────────────────────
const HeroAvatar = ({ avatar, displayName }) => (
  <View style={av.outer}>
    {/* Vòng ngoài gỗ */}
    <View style={[av.ring, nativeShadow('#8B5E3C', 0.25, 10, { width: 0, height: 5 }, 7)]}>
      <View style={{ borderRadius: 60, overflow: 'hidden', ...StyleSheet.absoluteFillObject }}>
        <Image source={TEX.wood} style={{ width: '100%', height: '100%', opacity: 0.8 }} resizeMode="cover" />
      </View>
    </View>
    {/* WigglyFrame trong */}
    <View style={av.frameWrap}>
      <WigglyFrame size={104} color="#C8A96E" strokeWidth={2.5}>
        <Text style={av.emoji}>{avatar || '🧑'}</Text>
      </WigglyFrame>
    </View>
    {/* Dấu stamp góc phải dưới */}
    <View style={av.stamp}>
      <Text style={av.stampText}>✦</Text>
    </View>
  </View>
);

// ── WoodChip — tag metadata nhỏ ──────────────────────────────────────────────
const WoodChip = ({ icon, label }) => (
  <View style={ch.wrap}>
    <View style={{ borderRadius: 999, overflow: 'hidden', ...StyleSheet.absoluteFillObject }}>
      <Image source={TEX.wood} style={{ width: '100%', height: '100%', opacity: 0.75 }} resizeMode="cover" />
    </View>
    <Ionicons name={icon} size={13} color="#FDF5E6" style={{ zIndex: 1 }} />
    <Text style={ch.text}>{label}</Text>
  </View>
);

// ── WoodStatCard — ô thống kê nền gỗ tối ────────────────────────────────────
const WoodStatCard = ({ icon, label, value, unit, hasValue, accentColor }) => (
  <View style={[sc.shadow, nativeShadow('#2A1500', 0.20, 12, { width: 0, height: 8 }, 7)]}>
    <ImageBackground source={TEX.wood} style={sc.card} imageStyle={sc.cardImg} resizeMode="cover">
      <View style={sc.overlay}>
        <View style={[sc.iconBadge, { backgroundColor: accentColor || 'rgba(255,220,150,0.18)' }]}>
          <Ionicons name={icon} size={14} color="rgba(255,248,225,0.9)" />
          <Text style={sc.label} numberOfLines={1}>{label.toUpperCase()}</Text>
        </View>
        <View style={sc.divider} />
        {hasValue ? (
          <View>
            <Text style={sc.value} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.4}>{value}</Text>
            {unit ? <Text style={sc.unit}>{unit}</Text> : null}
          </View>
        ) : (
          <View style={sc.addRow}>
            <Ionicons name="add" size={12} color="#FDF5E6" />
            <Text style={sc.addText}>Thêm</Text>
          </View>
        )}
      </View>
    </ImageBackground>
  </View>
);

// ── MemberRow — hàng thành viên trong card ───────────────────────────────────
const MemberRow = ({ p, isActive, isLast, canDelete, onPress, onEdit, onDelete }) => (
  <>
    <TouchableOpacity
      style={[mr.row, isActive && mr.rowActive]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      {isActive && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: 0, overflow: 'hidden' }]} pointerEvents="none">
          <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.5 }} resizeMode="cover" />
        </View>
      )}
      <View style={[mr.avatar, isActive && mr.avatarActive]}>
        <Text style={{ fontSize: 22 }}>{p.avatar || '🧑'}</Text>
      </View>
      <View style={{ flex: 1, zIndex: 1 }}>
        <Text style={[mr.name, isActive && mr.nameActive]} numberOfLines={1}>
          {p.displayName || 'Chưa đặt tên'}
        </Text>
        <Text style={mr.sub} numberOfLines={1}>
          {RELATION_LABEL[p.relation] || 'Khác'}{p.age ? ` · ${p.age} tuổi` : ''}
        </Text>
      </View>

      {/* Action buttons bên phải */}
      <View style={mr.actions}>
        {/* Nút chỉnh sửa */}
        <TouchableOpacity
          style={mr.iconBtn}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="pencil-outline" size={16} color="#9A7040" />
        </TouchableOpacity>

        {/* Nút xóa — chỉ hiện khi có thể xóa */}
        {canDelete && (
          <TouchableOpacity
            style={[mr.iconBtn, mr.iconBtnDelete]}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color="#C0392B" />
          </TouchableOpacity>
        )}

        {isActive
          ? <View style={mr.activePill}><Text style={mr.activePillText}>✓</Text></View>
          : <Ionicons name="chevron-forward" size={16} color="#C8A96E" style={{ zIndex: 1 }} />
        }
      </View>
    </TouchableOpacity>
    {!isLast && <View style={mr.divider} />}
  </>
);

// ── MenuItem — hàng cài đặt ──────────────────────────────────────────────────
const MenuItem = ({ icon, iconColor, iconBgColor, label, sub, onPress, isLast }) => (
  <>
    <TouchableOpacity style={mi.row} onPress={onPress} activeOpacity={0.72}>
      <View style={[mi.iconBox, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={18} color="#FFF" />
      </View>
      <View style={mi.textWrap}>
        <Text style={mi.label} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={mi.sub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color="#C8A96E" />
    </TouchableOpacity>
    {!isLast && <View style={mi.divider} />}
  </>
);

// ── SectionStamp — tiêu đề section phong cách stamp ──────────────────────────
const SectionStamp = ({ label }) => (
  <View style={ss.wrap}>
    <View style={ss.line} />
    <View style={ss.badge}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: 999, overflow: 'hidden' }]} pointerEvents="none">
        <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.8 }} resizeMode="cover" />
      </View>
      <Text style={ss.text}>{label}</Text>
    </View>
    <View style={ss.line} />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { profile, latestMetrics, profiles, activeProfileId, switchProfile, loadAllProfilesAction } = useAppStore();

  useFocusEffect(useCallback(() => { loadAllProfilesAction(); }, []));

  // Xóa profile: xóa Firestore + xóa luôn meal plan hôm nay của profile đó
  const handleDeleteProfile = (p) => {
    Alert.alert(
      `Xóa "${p.displayName}"?`,
      'Thành viên và các món ăn hôm nay của họ sẽ bị xóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: async () => {
            // 1. Xóa khỏi Firestore
            await deleteProfileMember(p.profileId);
            // 2. Xóa món ăn hôm nay của profile này
            await removeMealPlanByProfileId(p.profileId);
            // 3. Nếu đang xóa active profile → switch sang profile khác
            if (p.profileId === activeProfileId) {
              const rest = profiles.filter(x => x.profileId !== p.profileId);
              if (rest.length > 0) await switchProfile(rest[0].profileId);
            }
            await loadAllProfilesAction();
          },
        },
      ]
    );
  };

  // BMI calculation
  let bmi = null, bmiLabel = 'BMI';
  if (latestMetrics?.height_cm && latestMetrics?.weight_kg) {
    const h = latestMetrics.height_cm / 100;
    const val = latestMetrics.weight_kg / (h * h);
    bmi = val.toFixed(1);
    if (val < 18.5) bmiLabel = 'Thiếu cân';
    else if (val < 25) bmiLabel = 'Bình thường';
    else if (val < 30) bmiLabel = 'Thừa cân';
    else bmiLabel = 'Béo phì';
  }

  const menuItems = [
    { icon: 'person-outline', iconBgColor: '#C8A96E', label: 'Thông tin cá nhân',
      sub: profile ? `${profile.age} tuổi · ${DIET_LABEL[profile.diet_type] || '–'}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('EditPersonal') },
    { icon: 'barbell-outline', iconBgColor: '#8B9E6A', label: 'Chỉ số cơ thể',
      sub: latestMetrics ? `${latestMetrics.weight_kg} kg · BMI ${bmi}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('BodyMetrics') },
    { icon: 'warning-outline', iconBgColor: '#C88A5A', label: 'Dị ứng & Chế độ ăn',
      sub: 'Quản lý thực phẩm cần tránh',
      onPress: () => navigation.getParent()?.navigate('Allergy') },
    { icon: 'restaurant-outline', iconBgColor: '#A06E6E', label: 'Khẩu vị của tôi',
      sub: 'Sở thích hương vị cá nhân',
      onPress: () => navigation.getParent()?.navigate('TasteProfile') },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      {/* Layer 1 — gỗ nền */}
      <Image source={TEX.wood} style={[StyleSheet.absoluteFillObject, { opacity: 0.82 }]} resizeMode="cover" />
      {/* Layer 2 — overlay kem */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(240,230,210,0.48)' }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
      >

        {/* ══ HERO SECTION ═══════════════════════════════════════════════════ */}
        <View style={s.heroSection}>
          <HeroAvatar avatar={profile?.avatar || profiles[0]?.avatar} displayName={profile?.displayName} />

          {/* Tên người dùng */}
          <Text style={s.heroName} numberOfLines={1}>
            {profile?.displayName || profiles[0]?.displayName || 'Hồ sơ của bạn'}
          </Text>

          {/* Pills khẩu vị + hoạt động */}
          <View style={s.pillsRow}>
            {profile?.diet_type && (
              <WoodChip icon="restaurant-outline" label={DIET_LABEL[profile.diet_type]} />
            )}
            {profile?.activity_level && (
              <WoodChip icon="bicycle-outline" label={ACTIVITY_LABEL[profile.activity_level] || 'Nhẹ nhàng'} />
            )}
            {profile?.age && (
              <WoodChip icon="calendar-outline" label={`${profile.age} tuổi`} />
            )}
          </View>
        </View>

        {/* ══ SETUP BANNER — hiện khi profile chưa đủ thông tin ════════════ */}
        {(!profile?.age || !latestMetrics?.weight_kg) && (
          <View style={s.setupBanner}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]} pointerEvents="none">
              <Image source={TEX.paper} style={{ width: '100%', height: '100%', opacity: 0.9 }} resizeMode="cover" />
            </View>
            <Text style={s.setupTitle}>👋 Chào mừng! Hãy thiết lập hồ sơ</Text>
            <Text style={s.setupSub}>Điền đầy đủ thông tin để nhận gợi ý món ăn phù hợp nhất.</Text>
            <View style={s.setupSteps}>
              {!profile?.age && (
                <TouchableOpacity style={s.setupStep} onPress={() => navigation.getParent()?.navigate('EditPersonal')}>
                  <View style={s.setupStepDot}><Text style={s.setupStepNum}>1</Text></View>
                  <Text style={s.setupStepText}>Thông tin cá nhân (tuổi, giới tính...)</Text>
                  <Ionicons name="chevron-forward" size={14} color="#C8A96E" />
                </TouchableOpacity>
              )}
              {!latestMetrics?.weight_kg && (
                <TouchableOpacity style={s.setupStep} onPress={() => navigation.getParent()?.navigate('BodyMetrics')}>
                  <View style={s.setupStepDot}><Text style={s.setupStepNum}>2</Text></View>
                  <Text style={s.setupStepText}>Chỉ số cơ thể (cân nặng, chiều cao)</Text>
                  <Ionicons name="chevron-forward" size={14} color="#C8A96E" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.setupStep} onPress={() => navigation.getParent()?.navigate('Allergy')}>
                <View style={s.setupStepDot}><Text style={s.setupStepNum}>3</Text></View>
                <Text style={s.setupStepText}>Dị ứng thực phẩm (nếu có)</Text>
                <Ionicons name="chevron-forward" size={14} color="#C8A96E" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══ STATS ROW ══════════════════════════════════════════════════════ */}
        <View style={s.statsRow}>
          <WoodStatCard
            icon="scale-outline" label="Cân nặng"
            value={latestMetrics?.weight_kg ?? '–'} unit="kg"
            hasValue={Boolean(latestMetrics?.weight_kg)}
            accentColor="rgba(100,180,255,0.22)"
          />
          <WoodStatCard
            icon="resize-outline" label="Chiều cao"
            value={latestMetrics?.height_cm ?? '–'} unit="cm"
            hasValue={Boolean(latestMetrics?.height_cm)}
            accentColor="rgba(160,220,130,0.22)"
          />
          <WoodStatCard
            icon="analytics-outline" label={bmiLabel}
            value={bmi ?? '–'} unit=""
            hasValue={Boolean(bmi)}
            accentColor="rgba(255,180,100,0.25)"
          />
        </View>

        {/* ══ MEMBERS ════════════════════════════════════════════════════════ */}
        <SectionStamp label="🏠  Thành viên gia đình" />

        <View style={[s.cardShadow, nativeShadow('#8B5E3C', 0.18, 8, { width: 0, height: 4 }, 5)]}>
          <View style={s.card}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
              <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View style={{ zIndex: 1 }}>
              {profiles.map((p, i) => (
                <MemberRow
                  key={p.profileId}
                  p={p}
                  isActive={p.profileId === activeProfileId}
                  isLast={i === profiles.length - 1}
                  canDelete={profiles.length > 1}
                  onPress={() => p.profileId !== activeProfileId && switchProfile(p.profileId)}
                  onEdit={() => navigation.getParent()?.navigate('AddEditProfile', { profileId: p.profileId })}
                  onDelete={() => handleDeleteProfile(p)}
                />
              ))}

              {/* Dashed "Thêm thành viên" */}
              <TouchableOpacity
                style={s.addMember}
                activeOpacity={0.75}
                onPress={() => navigation.getParent()?.navigate('AddEditProfile')}
              >
                <Ionicons name="add-circle-outline" size={17} color="#9A7040" />
                <Text style={s.addMemberText}>Thêm thành viên mới</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══ SETTINGS ═══════════════════════════════════════════════════════ */}
        <SectionStamp label="⚙️  Thiết lập" />

        <View style={[s.cardShadow, nativeShadow('#8B5E3C', 0.18, 8, { width: 0, height: 4 }, 5)]}>
          <View style={s.card}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]} pointerEvents="none">
              <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View style={{ zIndex: 1 }}>
              {menuItems.map((item, i) => (
                <MenuItem
                  key={item.label}
                  {...item}
                  isLast={i === menuItems.length - 1}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ── Footer dấu chân mèo ── */}
        <View style={s.footer}>
          <Text style={s.footerPaw}>🐾</Text>
          <Text style={s.footerPaw}>🐾</Text>
        </View>

      </ScrollView>
    </View>
  );
};

// ── StyleSheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5EDDC' },
  scroll: { paddingHorizontal: 18 },

  // Hero
  heroSection: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  heroName: {
    fontFamily: 'Lora-Bold', fontSize: 24, color: '#3D2B1F',
    marginTop: 14, marginBottom: 10, textAlign: 'center',
  },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 10 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },

  // Card (parchment)
  cardShadow: { borderRadius: 20, marginBottom: 28 },
  card: {
    borderRadius: 20, backgroundColor: '#F5EDDC',
    borderWidth: 1.5, borderColor: '#C8A96E',
    overflow: 'hidden', // clip nội dung trong card, shadow vẫn OK vì nằm ở cardShadow
  },

  // Add member dashed button
  addMember: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, minHeight: 48,
    marginHorizontal: 4, marginBottom: 4,
    borderRadius: 14, backgroundColor: 'transparent',
  },
  addMemberText: {
    fontFamily: 'BeVietnamPro-Bold', fontSize: 14, color: '#9A7040',
  },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 20, opacity: 0.4 },
  footerPaw: { fontSize: 22 },

  // Setup Banner
  setupBanner: {
    borderRadius: 16, borderWidth: 1.5, borderColor: '#C8A96E',
    padding: 16, marginBottom: 20, overflow: 'hidden',
  },
  setupTitle: {
    fontFamily: 'Lora-Bold', fontSize: 15, color: '#3D2B1F', marginBottom: 4,
  },
  setupSub: {
    fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: '#8B7355', marginBottom: 12,
  },
  setupSteps: { gap: 8 },
  setupStep: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(200,169,110,0.12)', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.3)',
  },
  setupStepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#C8A96E', justifyContent: 'center', alignItems: 'center',
  },
  setupStepNum: { fontFamily: 'BeVietnamPro-Bold', fontSize: 11, color: '#FFF8EA' },
  setupStepText: { flex: 1, fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: '#3D2B1F' },
});

// ── Avatar styles ─────────────────────────────────────────────────────────────
const av = StyleSheet.create({
  outer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: '#9A7040',
  },
  frameWrap: { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 50 },
  stamp: {
    position: 'absolute', bottom: 2, right: 4,
    backgroundColor: '#C8A96E', borderRadius: 999,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#F5EDDC',
  },
  stampText: { fontSize: 10, color: '#FFF8EA', fontFamily: 'BeVietnamPro-Bold' },
});

// ── WoodChip styles ───────────────────────────────────────────────────────────
const ch = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: '#9A7040',
  },
  text: { fontFamily: 'BeVietnamPro-Bold', fontSize: 12, color: '#FDF5E6', zIndex: 1 },
});

// ── WoodStatCard styles ───────────────────────────────────────────────────────
const sc = StyleSheet.create({
  shadow: { flex: 1, borderRadius: 18 },
  card: { flex: 1, height: 120, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(160,120,74,0.3)', overflow: 'hidden' },
  cardImg: { borderRadius: 18, opacity: 0.85 },
  overlay: {
    backgroundColor: 'rgba(15,7,2,0.30)', flex: 1,
    paddingHorizontal: 11, paddingTop: 10, paddingBottom: 12, justifyContent: 'space-between',
  },
  iconBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start',
  },
  label: { fontFamily: 'BeVietnamPro-Bold', fontSize: 9, color: '#FDF5E6', opacity: 0.85, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: 'rgba(255,240,200,0.12)', marginVertical: 6 },
  value: { fontFamily: 'Lora-Bold', fontSize: 26, color: '#FFF9EB', letterSpacing: -0.5, lineHeight: 32 },
  unit: { fontFamily: 'BeVietnamPro-Regular', fontSize: 10, color: '#FDF5E6', opacity: 0.55, marginTop: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 13, color: '#FDF5E6' },
});

// ── MemberRow styles ──────────────────────────────────────────────────────────
const mr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16, minHeight: 64,
  },
  rowActive: { backgroundColor: 'transparent' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(200,169,110,0.15)',
    borderWidth: 1.5, borderColor: '#C8A96E',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarActive: { borderColor: '#8B5E3C', borderWidth: 2 },
  name: { fontFamily: 'BeVietnamPro-Bold', fontSize: 15, color: '#3D2B1F', marginBottom: 2 },
  nameActive: { fontFamily: 'Lora-Bold', color: '#5C3A1E' },
  sub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: '#8B7355' },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1,
  },
  iconBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(200,169,110,0.15)',
    borderWidth: 1, borderColor: 'rgba(200,169,110,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnDelete: {
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderColor: 'rgba(192,57,43,0.3)',
  },
  activePill: {
    backgroundColor: '#C8A96E', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  activePillText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 11, color: '#FFF8EA' },
  divider: { height: 1, backgroundColor: 'rgba(200,169,110,0.25)', marginHorizontal: 16 },
});

// ── MenuItem styles ───────────────────────────────────────────────────────────
const mi = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 0,
    paddingVertical: 13, paddingHorizontal: 16, minHeight: 64,
  },
  iconBox: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  textWrap: { flex: 1, justifyContent: 'center' },
  label: { fontFamily: 'Lora-Bold', fontSize: 16, color: '#3D2B1F', marginBottom: 2 },
  sub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: '#8B7355' },
  divider: { height: 1, backgroundColor: 'rgba(200,169,110,0.25)', marginHorizontal: 16 },
});

// ── SectionStamp styles ───────────────────────────────────────────────────────
const ss = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 4,
  },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(200,169,110,0.45)' },
  badge: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1.5, borderColor: '#C8A96E',
    backgroundColor: 'rgba(245,237,220,0.7)',
  },
  text: { fontFamily: 'Lora-Bold', fontSize: 14, color: '#5C3A1E', zIndex: 1 },
});

export default ProfileScreen;
