import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Animated, Dimensions, ImageBackground,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WoodPicker from '../components/ui/WoodPicker';
import Svg, { Path } from 'react-native-svg';
import { ForkKnife }       from 'phosphor-react-native/lib/module/icons/ForkKnife';
import { CurrencyDollar }  from 'phosphor-react-native/lib/module/icons/CurrencyDollar';
import { Timer }           from 'phosphor-react-native/lib/module/icons/Timer';
import { Globe }           from 'phosphor-react-native/lib/module/icons/Globe';
import { Ruler }           from 'phosphor-react-native/lib/module/icons/Ruler';
import { ArrowsClockwise } from 'phosphor-react-native/lib/module/icons/ArrowsClockwise';
import { DownloadSimple }  from 'phosphor-react-native/lib/module/icons/DownloadSimple';
import { Trash }           from 'phosphor-react-native/lib/module/icons/Trash';
import { GearSix }         from 'phosphor-react-native/lib/module/icons/GearSix';
import { PawPrint }        from 'phosphor-react-native/lib/module/icons/PawPrint';
import { SignOut }         from 'phosphor-react-native/lib/module/icons/SignOut';
import { getSetting, setSetting, clearAllHistory } from '../utils/database';
import { useAppStore } from '../store/useAppStore';
import { supabase }    from '../store/suppabase';
import { C }           from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard        from '../components/ui/PaperCard';
import SectionHeader    from '../components/ui/SectionHeader';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 32;

const CATTR = require('../assets/animations/pets.json');

// ─── PhosphorIcon ────────────────────────────────────────────────────────────
const PhosphorIcon = ({ IconComponent, danger }) => (
  <IconComponent
    weight="duotone"
    size={22}
    color={danger ? C.accentRed : '#8B5E3C'}
  />
);

// ─── WobblyBorder ────────────────────────────────────────────────────────────
const WobblyBorder = ({ width, height, color = C.dashed, sw = 1.8, dash = '5,4' }) => {
  const r = 18, w = width, h = height;
  const p = `M${r},3 Q${w * .5},1 ${w - r},4 Q${w - 3},3 ${w - 3},${r} Q${w - 1},${h * .5} ${w - 3},${h - r} Q${w - 2},${h - 2} ${w - r + 2},${h - 3} Q${w * .5},${h - 1} ${r - 1},${h - 3} Q2,${h - 2} 3,${h - r} Q1,${h * .5} 3,${r} Q2,2 ${r},3 Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={p} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={dash} strokeLinecap="round" />
    </Svg>
  );
};

// ─── SettingsRow ─────────────────────────────────────────────────────────────
const SettingsRow = ({ IconComponent, iconBg, label, control, danger, isLast, onPress }) => {
  const inner = (
    <>
      <View style={[st.settingsIconBox, { backgroundColor: danger ? 'rgba(231,76,60,0.2)' : iconBg }]}>
        <PhosphorIcon IconComponent={IconComponent} danger={danger} />
      </View>
      <Text style={[st.settingsRowLabel, danger && { color: C.accentRed }]}>{label}</Text>
      <View style={st.settingsControl}>
        {control}
      </View>
    </>
  );

  return (
    <>
      {onPress ? (
        <TouchableOpacity style={st.settingsRow} onPress={onPress} activeOpacity={0.75}>
          {inner}
        </TouchableOpacity>
      ) : (
        <View style={st.settingsRow}>
          {inner}
        </View>
      )}
      {!isLast && <View style={st.menuDivider} />}
    </>
  );
};

// ─── ActionRow ───────────────────────────────────────────────────────────────
const ActionRow = ({ IconComponent, iconBg, label, actionLabel, onPress, danger, isLast }) => (
  <SettingsRow
    IconComponent={IconComponent}
    iconBg={iconBg}
    label={label}
    danger={danger}
    isLast={isLast}
    onPress={onPress}
    control={
      <View style={[
        st.actionBadge,
        danger && { borderColor: 'rgba(231,76,60,0.3)', backgroundColor: 'rgba(231,76,60,0.1)' },
      ]}>
        <Text style={[st.actionText, danger && { color: C.accentRed }]}>{actionLabel}</Text>
      </View>
    }
  />
);

// ─── SettingsScreen ──────────────────────────────────────────────────────────
const SettingsScreen = () => {
  const [cuisinePreference, setCuisinePreference]   = useState('vietnam');
  const [maxCookTime,       setMaxCookTime]          = useState('60');
  const [costPreference,    setCostPreferenceLocal]  = useState('2');
  const [language,          setLanguage]             = useState('vi');
  const [unitSystem,        setUnitSystem]           = useState('metric');

  const { location, setLocation, setCostPreference: setStoreCostPref } = useAppStore();
  const insets = useSafeAreaInsets();

  const gearRot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings();
    Animated.loop(
      Animated.timing(gearRot, { toValue: 1, duration: 12000, useNativeDriver: true })
    ).start();
  }, []);

  const loadSettings = async () => {
    try {
      const [cuisine, cook, cost, lang, unit, lat, lon, province] = await Promise.all([
        getSetting('default_cuisine'), getSetting('max_cook_time'),
        getSetting('cost_preference'), getSetting('language'),
        getSetting('unit_system'),     getSetting('last_known_lat'),
        getSetting('last_known_lon'),  getSetting('last_known_province'),
      ]);
      setCuisinePreference(cuisine  || 'vietnam');
      setMaxCookTime(cook           || '60');
      setCostPreferenceLocal(cost   || '2');
      setLanguage(lang              || 'vi');
      setUnitSystem(unit            || 'metric');
      if (lat && lon) setLocation({
        ...location,
        lat:      parseFloat(lat),
        lon:      parseFloat(lon),
        province: province || location?.province,
      });
    } catch (e) { console.error('loadSettings:', e); }
  };

  const save = async (key, val) => {
    try { await setSetting(key, String(val)); }
    catch { Alert.alert('Lỗi', 'Không thể lưu cài đặt'); }
  };

  const handleCuisineChange  = async v => { setCuisinePreference(v);  await save('default_cuisine', v); };
  const handleCookTimeChange = async v => { setMaxCookTime(v);         await save('max_cook_time',  v); };
  const handleLanguageChange = async v => { setLanguage(v);            await save('language',        v); };
  const handleUnitChange     = async v => { setUnitSystem(v);          await save('unit_system',     v); };
  const handleCostChange     = async v => {
    setCostPreferenceLocal(v);
    setStoreCostPref(Number(v));
    await save('cost_preference', v);
  };

  const clearHistory = () => {
    Alert.alert('Xóa lịch sử', 'Hành động này không thể hoàn tác nhé!', [
      { text: 'Thôi', style: 'cancel' },
      {
        text: 'Xóa hết', style: 'destructive', onPress: async () => {
          try {
            await clearAllHistory();
            Alert.alert('Xong rồi! 🌿', 'Lịch sử đã được xóa sạch');
          } catch {
            Alert.alert('Ối!', 'Không thể xóa lịch sử');
          }
        },
      },
    ]);
  };

  const syncIngredients = () => {
    Alert.alert('Thông báo', 'Đang đồng bộ nguyên liệu...');
    setTimeout(() => Alert.alert('Thành công ✓', 'Nguyên liệu đã được cập nhật'), 1000);
  };

  const exportData = () => Alert.alert('Xuất dữ liệu', 'Tính năng sẽ có trong phiên bản tới 🚀');

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn chắc chắn muốn đăng xuất không? 🐱',
      [
        { text: 'Thôi', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            // App.js lắng nghe onAuthStateChange → tự chuyển về LoginScreen
          },
        },
      ]
    );
  };

  const gearDeg = gearRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ScreenBackground texture="paper" edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
      >
        {/* ── Header ── */}
        <ImageBackground
          source={require('../assets/textures/sky_watercolor.png')}
          style={[st.header, { paddingTop: insets.top + 12 }]}
          resizeMode="cover"
          imageStyle={{ opacity: 0.45 }}
        >
          {/* Mèo Cattr phía trên bánh răng */}
          <LottieView
            source={CATTR}
            autoPlay
            loop
            style={[st.cattrLottie, { pointerEvents: 'none' }]}
          />

          {/* Bánh răng xoay */}
          <Animated.View style={{ transform: [{ rotate: gearDeg }], marginBottom: 6 }}>
            <GearSix weight="duotone" size={44} color={C.textMid} />
          </Animated.View>

          <Text style={st.headerTitle}>Cài đặt</Text>
          <Text style={st.headerSub}>Tuỳ chỉnh theo ý bạn nhé</Text>
          <Svg width={SW} height={22} style={st.headerWave}>
            <Path
              d={`M0,8 Q${SW * .13},20 ${SW * .27},9 Q${SW * .41},0 ${SW * .55},11 Q${SW * .69},20 ${SW * .83},8 Q${SW * .92},2 ${SW},9 L${SW},22 L0,22 Z`}
              fill={C.bg}
            />
          </Svg>
        </ImageBackground>

        {/* ── Section: Gợi ý mặc định ── */}
        <SectionHeader title="Gợi ý mặc định" />
        <PaperCard containerStyle={st.cardWrapper}>
          <SettingsRow
            IconComponent={ForkKnife}
            iconBg="rgba(245,158,11,0.2)"
            label="Phạm vi ẩm thực"
            control={
              <WoodPicker
                selectedValue={cuisinePreference}
                onValueChange={handleCuisineChange}
                items={[
                  { label: 'Việt Nam',  value: 'vietnam',  flagCode: 'VN'     },
                  { label: 'Toàn cầu',  value: 'global',   flagCode: 'GLOBAL' },
                  { label: 'Nhật Bản',  value: 'japan',    flagCode: 'JP'     },
                  { label: 'Thái Lan',  value: 'thailand', flagCode: 'TH'     },
                  { label: 'Ý',         value: 'italy',    flagCode: 'IT'     },
                  { label: 'Hàn Quốc', value: 'korea',    flagCode: 'KR'     },
                ]}
              />
            }
          />
          <SettingsRow
            IconComponent={CurrencyDollar}
            iconBg="rgba(56,176,122,0.2)"
            label="Mức chi phí"
            control={
              <WoodPicker
                selectedValue={costPreference}
                onValueChange={handleCostChange}
                items={[
                  { label: '🌿 Tiết kiệm', value: '1' },
                  { label: '💰 Vừa phải',  value: '2' },
                  { label: '💎 Thoải mái', value: '3' },
                ]}
              />
            }
          />
          <SettingsRow
            IconComponent={Timer}
            iconBg="rgba(52,152,219,0.2)"
            label="Thời gian nấu tối đa"
            control={
              <WoodPicker
                selectedValue={maxCookTime}
                onValueChange={handleCookTimeChange}
                items={['15', '30', '45', '60', '75', '90', '115'].map(v => ({ label: `${v} phút`, value: v }))}
              />
            }
            isLast
          />
        </PaperCard>


        {/* ── Section: Tài khoản ── */}
        <SectionHeader title="Tài khoản" />
        <PaperCard containerStyle={st.cardWrapper}>
          <ActionRow
            IconComponent={SignOut}
            iconBg="rgba(231,76,60,0.2)"
            label="Đăng xuất"
            actionLabel="Thoát"
            onPress={handleLogout}
            danger
            isLast
          />
        </PaperCard>

        {/* ── Footer ── */}
        <View style={st.footer}>
          <Svg width={120} height={10} style={{ marginBottom: 10 }}>
            <Path d="M0,5 Q30,1 60,5 Q90,9 120,5"
              fill="none" stroke={C.dashed} strokeWidth={1.2} strokeDasharray="4,3" />
          </Svg>
          <View style={st.versionBadge}>
            <Text style={st.versionText}>🌿 Phiên bản 1.0.0</Text>
          </View>
          <Text style={st.serverText}>api.wafrs.app</Text>
          <PawPrint weight="duotone" size={24} color={C.woodLight} style={{ opacity: 0.3, marginTop: 8 }} />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </ScreenBackground>
  );
};

const st = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // ── Header ──
  header:      { alignItems: 'center', paddingBottom: 0, backgroundColor: 'rgba(52,152,219,0.15)' },
  cattrLottie: { width: 140, height: 140, marginBottom: -8 },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 30, color: C.text },
  headerSub:   { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: C.textLight, marginTop: 4, marginBottom: 10 },
  headerWave:  { marginTop: 2 },

  // ── Card ──
  cardWrapper: { paddingHorizontal: 16, paddingVertical: 8 },

  // ── Row ──
  settingsRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  settingsIconBox:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingsRowLabel: { flex: 1, flexShrink: 1, flexWrap: 'wrap', fontFamily: 'Nunito_700Bold', fontSize: 16, color: C.text },
  settingsControl:  { minWidth: 120, maxWidth: 140, justifyContent: 'center', alignItems: 'flex-end' },

  // ── Action badge ──
  actionBadge: {
    height: 40, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.borderLight, borderRadius: 12, minWidth: 100,
  },
  actionText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.textMid },

  // ── Divider ──
  menuDivider: { height: 1, backgroundColor: C.borderLight, marginLeft: 56, opacity: 0.8 },

  // ── Footer ──
  footer:       { alignItems: 'center', marginTop: 36, gap: 6 },
  versionBadge: {
    height: 36, justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.surfaceAlt, borderRadius: 18, paddingHorizontal: 20,
    borderWidth: 1, borderColor: C.borderLight,
  },
  versionText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.textLight },
  serverText:  { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: C.textLight, opacity: 0.6 },
});

export default SettingsScreen;