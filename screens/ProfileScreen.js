import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Scales } from 'phosphor-react-native/lib/module/icons/Scales';
import { Ruler } from 'phosphor-react-native/lib/module/icons/Ruler';
import { ChartBar } from 'phosphor-react-native/lib/module/icons/ChartBar';
import { Person } from 'phosphor-react-native/lib/module/icons/Person';
import { PersonSimpleRun } from 'phosphor-react-native/lib/module/icons/PersonSimpleRun';
import { Warning } from 'phosphor-react-native/lib/module/icons/Warning';
import { ForkKnife } from 'phosphor-react-native/lib/module/icons/ForkKnife';
import { CaretRight } from 'phosphor-react-native/lib/module/icons/CaretRight';
import { PawPrint } from 'phosphor-react-native/lib/module/icons/PawPrint';
import { useAppStore } from '../store/useAppStore';

import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard from '../components/ui/PaperCard';
import SectionHeader from '../components/ui/SectionHeader';

const { width: SW } = Dimensions.get('window');

const DIET_LABEL     = { omnivore:'Ăn tất cả', vegetarian:'Chay', vegan:'Thuần chay', pescatarian:'Ăn cá' };
const ACTIVITY_LABEL = { sedentary:'Ít vận động', lightly_active:'Nhẹ nhàng', moderately_active:'Vừa phải', very_active:'Nhiều vận động' };

const ProfileAvatarMark = () => (
  <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" fill="rgba(139,94,60,0.08)" />
    <Path
      d="M24 11.5C19.86 11.5 16.5 14.86 16.5 19C16.5 23.14 19.86 26.5 24 26.5C28.14 26.5 31.5 23.14 31.5 19C31.5 14.86 28.14 11.5 24 11.5Z"
      fill="#CDA06D"
    />
    <Path
      d="M13.5 37.2C15.91 32.62 19.52 30.25 24 30.25C28.48 30.25 32.09 32.62 34.5 37.2"
      stroke="#8B5E3C"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <Path
      d="M24 13.25C20.83 13.25 18.25 15.83 18.25 19C18.25 22.17 20.83 24.75 24 24.75C27.17 24.75 29.75 22.17 29.75 19C29.75 15.83 27.17 13.25 24 13.25Z"
      stroke="#8B5E3C"
      strokeWidth="2.5"
    />
    <Path
      d="M17.25 35.75C19.2 33.35 21.43 32.25 24 32.25C26.57 32.25 28.8 33.35 30.75 35.75"
      stroke="#CDA06D"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </Svg>
);

const StatCard = ({ label, value, unit, color, IconComponent }) => (
  <PaperCard containerStyle={st.statCard} style={{ flex: 1, paddingVertical: 18, alignItems: 'center' }}>
    <IconComponent weight="duotone" size={28} color={color} style={{ marginBottom: 4 }} />
    <Text style={[st.statValue, { color }]}>{value}</Text>
    {unit ? <Text style={[st.statUnit, { color }]}>{unit}</Text> : null}
    <Text style={st.statLabel}>{label}</Text>
  </PaperCard>
);

const MenuItem = ({ IconComponent, iconBg, label, sub, onPress, isLast }) => (
  <>
    <TouchableOpacity style={st.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[st.menuIconWrap, { backgroundColor: iconBg || C.bg }]}>
        <IconComponent weight="duotone" size={24} color={C.text} />
      </View>
      <View style={st.menuTextWrap}>
        <Text style={st.menuLabel}>{label}</Text>
        {sub ? <Text style={st.menuSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <CaretRight weight="bold" size={18} color={C.border} />
    </TouchableOpacity>
    {!isLast && (
      <View style={st.menuDivider} />
    )}
  </>
);

const Avatar = () => {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -6, duration: 1200, useNativeDriver: true }),
      Animated.timing(bob, { toValue:  0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Animated.View style={[st.avatarWrap, { transform: [{ translateY: bob }] }]}>
      <View style={st.avatarGlow}/>
      <View style={st.avatarRing}>
        <View style={st.avatarInner}>
          <ProfileAvatarMark />
        </View>
      </View>
    </Animated.View>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { profile, latestMetrics } = useAppStore();
  const insets = useSafeAreaInsets();

  let bmi = null, bmiColor = C.accentBlue, bmiLabel = '–';
  if (latestMetrics?.height_cm && latestMetrics?.weight_kg) {
    const h = latestMetrics.height_cm / 100;
    bmi = (latestMetrics.weight_kg / (h * h)).toFixed(1);
    if      (bmi < 18.5) { bmiColor = C.accentBlue;  bmiLabel = 'Thiếu cân'; }
    else if (bmi < 25)   { bmiColor = C.accentGreen; bmiLabel = 'Bình thường'; }
    else if (bmi < 30)   { bmiColor = C.amber;       bmiLabel = 'Thừa cân'; }
    else                 { bmiColor = C.accentRed;   bmiLabel = 'Béo phì'; }
  }

  const menuItems = [
    {
      IconComponent: Person, iconBg: 'rgba(52,152,219,0.2)', label: 'Thông tin cá nhân',
      sub: profile ? `${profile.age} tuổi · ${DIET_LABEL[profile.diet_type] || ''}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('EditPersonal'),
    },
    {
      IconComponent: Scales, iconBg: 'rgba(56,176,122,0.2)', label: 'Chỉ số cơ thể',
      sub: latestMetrics ? `${latestMetrics.weight_kg} kg · BMI ${bmi}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('BodyMetrics'),
    },
    {
      IconComponent: Warning, iconBg: 'rgba(245,158,11,0.2)', label: 'Dị ứng & Chế độ ăn',
      sub: 'Quản lý thực phẩm cần tránh',
      onPress: () => navigation.getParent()?.navigate('Allergy'),
    },
    {
      IconComponent: ForkKnife, iconBg: 'rgba(231,76,60,0.2)', label: 'Khẩu vị của tôi',
      sub: 'Sở thích hương vị cá nhân',
      onPress: () => navigation.getParent()?.navigate('TasteProfile'),
    },
  ];

  return (
    <ScreenBackground texture="paper" edges={[]}>
      {/* ── Hero section using sky watercolor ── */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={[st.hero, { paddingTop: insets.top + 10 }]} resizeMode="cover"
        imageStyle={{ opacity: 0.55 }}
      >
        <View style={[st.deco, { width: 90, height: 90, top: insets.top + 20, right: 24, opacity: 0.12 }]}/>
        <View style={[st.deco, { width: 55, height: 55, top: insets.top + 60, left: 10,  opacity: 0.10 }]}/>
        <View style={[st.deco, { width: 40, height: 40, bottom: 30, right: 60, opacity: 0.08 }]}/>

        <Avatar />

        <Text style={st.heroAge}>
          {profile?.age ? `${profile.age} tuổi` : 'Chưa thiết lập'}
        </Text>

        <View style={st.heroPills}>
          {profile?.diet_type && (
            <View style={st.heroPill}>
              <ForkKnife weight="duotone" size={14} color={C.text} style={{ marginRight: 4 }} />
              <Text style={st.heroPillText}>{DIET_LABEL[profile.diet_type]}</Text>
            </View>
          )}
          {profile?.activity_level && (
            <View style={[st.heroPill, { backgroundColor: 'rgba(56,176,122,0.3)' }]}>
              <PersonSimpleRun weight="duotone" size={14} color={C.text} style={{ marginRight: 4 }} />
              <Text style={st.heroPillText}>{ACTIVITY_LABEL[profile.activity_level]}</Text>
            </View>
          )}
        </View>

        <Svg width={SW} height={24} style={st.wave}>
          <Path
            d={`M0,8 Q${SW*.13},22 ${SW*.27},10 Q${SW*.41},0 ${SW*.55},12 Q${SW*.69},22 ${SW*.83},9 Q${SW*.91},2 ${SW},10 L${SW},24 L0,24 Z`}
            fill={C.bg} />
        </Svg>
      </ImageBackground>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        
        <View style={st.statsRow}>
          <StatCard
            IconComponent={Scales} label="Cân nặng"
            value={latestMetrics?.weight_kg ?? '–'} unit="kg"
            color={C.accentBlue}
          />
          <StatCard
            IconComponent={Ruler} label="Chiều cao"
            value={latestMetrics?.height_cm ?? '–'} unit="cm"
            color={C.primary}
          />
          <StatCard
            IconComponent={ChartBar} label={bmiLabel}
            value={bmi ?? '–'} unit=""
            color={bmiColor}
          />
        </View>

        <SectionHeader title="Hồ sơ của tôi" />

        <PaperCard containerStyle={st.cardWrapper}>
          {menuItems.map((item, i) => (
            <MenuItem
              key={item.label}
              {...item}
              isLast={i === menuItems.length - 1}
            />
          ))}
        </PaperCard>

        <View style={st.footer}>
          <PawPrint weight="duotone" size={24} color={C.woodLight} style={{ opacity: 0.5, marginRight: 8 }} />
          <PawPrint weight="duotone" size={24} color={C.woodLight} style={{ opacity: 0.3 }} />
        </View>

        <View style={{ height: 36 }}/>
      </ScrollView>
    </ScreenBackground>
  );
};

const st = StyleSheet.create({
  // ── Hero ──
  hero:         { paddingBottom: 0, alignItems: 'center', backgroundColor: 'rgba(52,152,219,0.15)' },
  deco:         { position: 'absolute', borderRadius: 999, backgroundColor: C.primary },
  wave:         { marginTop: 18 },

  // ── Avatar ──
  avatarWrap:   { marginTop: 10, marginBottom: 14, alignItems: 'center', justifyContent: 'center' },
  avatarGlow:   { position: 'absolute', width: 112, height: 112, borderRadius: 56,
                  backgroundColor: 'rgba(139,94,60,0.15)' },
  avatarRing:   { width: 96, height: 96, borderRadius: 48,
                  backgroundColor: C.woodLight, justifyContent: 'center', alignItems: 'center',
                  shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  avatarInner:  { width: 82, height: 82, borderRadius: 41,
                  backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },

  // ── Hero text ──
  heroAge:      { fontFamily: 'Nunito_700Bold', fontSize: 26, color: C.text, marginTop: 2, marginBottom: 2 },
  heroPills:    { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 10,
                  flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 24 },
  heroPill:     { backgroundColor: 'rgba(139,94,60,0.2)', borderRadius: 9999,
                  paddingHorizontal: 14, paddingVertical: 9,
                  flexDirection: 'row', alignItems: 'center' },
  heroPillText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.text },

  // ── Scroll ──
  scroll:       { paddingHorizontal: 16, paddingTop: 10 },

  // ── Stats row ──
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard:     { flex: 1, backgroundColor: C.surface, padding: 0 },
  statValue:    { fontFamily: 'Nunito_700Bold', fontSize: 24, lineHeight: 28 },
  statUnit:     { fontFamily: 'Nunito_700Bold', fontSize: 13, opacity: 0.8 },
  statLabel:    { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textLight,
                  marginTop: 6, textAlign: 'center' },

  // ── Menu card ──
  cardWrapper:  { paddingHorizontal: 16, paddingVertical: 10 },
  menuRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14,
                  justifyContent: 'center', alignItems: 'center' },
  menuTextWrap: { flex: 1, marginLeft: 16 },
  menuLabel:    { fontFamily: 'Nunito_700Bold', fontSize: 16, color: C.text },
  menuSub:      { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textLight, marginTop: 3 },
  menuDivider:  { height: 1, backgroundColor: C.borderLight, marginLeft: 60, opacity: 0.8 },

  // ── Footer ──
  footer:       { flexDirection: 'row', justifyContent: 'center', paddingTop: 32 },
});

export default ProfileScreen;
