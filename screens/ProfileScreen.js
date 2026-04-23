import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';

import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard from '../components/ui/PaperCard';
import SectionHeader from '../components/ui/SectionHeader';

const { width: SW } = Dimensions.get('window');

const DIET_LABEL     = { omnivore:'Ăn tất cả', vegetarian:'Chay', vegan:'Thuần chay', pescatarian:'Ăn cá' };
const ACTIVITY_LABEL = { sedentary:'Ít vận động', lightly_active:'Nhẹ nhàng', moderately_active:'Vừa phải', very_active:'Nhiều vận động' };

const StatCard = ({ label, value, unit, color, icon }) => (
  <PaperCard containerStyle={st.statCard} style={{ flex: 1, paddingVertical: 18, alignItems: 'center' }}>
    <Ionicons name={icon} size={28} color={color} style={{ marginBottom: 4 }} />
    <Text style={[st.statValue, { color }]}>{value}</Text>
    {unit ? <Text style={[st.statUnit, { color }]}>{unit}</Text> : null}
    <Text style={st.statLabel}>{label}</Text>
  </PaperCard>
);

const MenuItem = ({ icon, iconBg, label, sub, onPress, isLast }) => (
  <>
    <TouchableOpacity style={st.menuRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[st.menuIconWrap, { backgroundColor: iconBg || C.bg }]}>
        <Ionicons name={icon} size={24} color={C.text} />
      </View>
      <View style={st.menuTextWrap}>
        <Text style={st.menuLabel}>{label}</Text>
        {sub ? <Text style={st.menuSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.border} />
    </TouchableOpacity>
    {!isLast && (
      <View style={st.menuDivider} />
    )}
  </>
);

const Avatar = ({ gender }) => {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -6, duration: 1200, useNativeDriver: true }),
      Animated.timing(bob, { toValue:  0, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, []);

  const getIcon = () => {
    if (gender === 'male') return 'man';
    if (gender === 'female') return 'woman';
    return 'person';
  };

  return (
    <Animated.View style={[st.avatarWrap, { transform: [{ translateY: bob }] }]}>
      <View style={st.avatarGlow}/>
      <View style={st.avatarRing}>
        <View style={st.avatarInner}>
          <Ionicons name={getIcon()} size={42} color={C.primary} />
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
      icon: 'person-outline', iconBg: 'rgba(52,152,219,0.2)', label: 'Thông tin cá nhân',
      sub: profile ? `${profile.age} tuổi · ${DIET_LABEL[profile.diet_type] || ''}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('EditPersonal'),
    },
    {
      icon: 'barbell-outline', iconBg: 'rgba(56,176,122,0.2)', label: 'Chỉ số cơ thể',
      sub: latestMetrics ? `${latestMetrics.weight_kg} kg · BMI ${bmi}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('BodyMetrics'),
    },
    {
      icon: 'warning-outline', iconBg: 'rgba(245,158,11,0.2)', label: 'Dị ứng & Chế độ ăn',
      sub: 'Quản lý thực phẩm cần tránh',
      onPress: () => navigation.getParent()?.navigate('Allergy'),
    },
    {
      icon: 'restaurant-outline', iconBg: 'rgba(231,76,60,0.2)', label: 'Khẩu vị của tôi',
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

        <Avatar gender={profile?.gender}/>

        <Text style={st.heroAge}>
          {profile?.age ? `${profile.age} tuổi` : 'Chưa thiết lập'}
        </Text>

        <View style={st.heroPills}>
          {profile?.diet_type && (
            <View style={st.heroPill}>
              <Ionicons name="restaurant" size={14} color={C.text} style={{ marginRight: 4 }} />
              <Text style={st.heroPillText}>{DIET_LABEL[profile.diet_type]}</Text>
            </View>
          )}
          {profile?.activity_level && (
            <View style={[st.heroPill, { backgroundColor: 'rgba(56,176,122,0.3)' }]}>
              <Ionicons name="walk" size={14} color={C.text} style={{ marginRight: 4 }} />
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
            icon="scale-outline" label="Cân nặng"
            value={latestMetrics?.weight_kg ?? '–'} unit="kg"
            color={C.accentBlue}
          />
          <StatCard
            icon="body-outline" label="Chiều cao"
            value={latestMetrics?.height_cm ?? '–'} unit="cm"
            color={C.primary}
          />
          <StatCard
            icon="analytics-outline" label={bmiLabel}
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
          <Ionicons name="paw" size={24} color={C.woodLight} style={{ opacity: 0.5, marginRight: 8 }} />
          <Ionicons name="paw" size={24} color={C.woodLight} style={{ opacity: 0.3 }} />
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
  wave:         { marginTop: 12 },

  // ── Avatar ──
  avatarWrap:   { marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  avatarGlow:   { position: 'absolute', width: 106, height: 106, borderRadius: 53,
                  backgroundColor: 'rgba(139,94,60,0.15)' },
  avatarRing:   { width: 92, height: 92, borderRadius: 46,
                  backgroundColor: C.woodLight, justifyContent: 'center', alignItems: 'center',
                  shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  avatarInner:  { width: 78, height: 78, borderRadius: 39,
                  backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },

  // ── Hero text ──
  heroAge:      { fontFamily: 'Nunito_700Bold', fontSize: 26, color: C.text },
  heroPills:    { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 4,
                  flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 },
  heroPill:     { backgroundColor: 'rgba(139,94,60,0.2)', borderRadius: 9999,
                  paddingHorizontal: 14, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center' },
  heroPillText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.text },

  // ── Scroll ──
  scroll:       { paddingHorizontal: 16, paddingTop: 6 },

  // ── Stats row ──
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard:     { flex: 1, backgroundColor: C.surface, padding: 0 },
  statValue:    { fontFamily: 'Nunito_700Bold', fontSize: 24, lineHeight: 28 },
  statUnit:     { fontFamily: 'Nunito_700Bold', fontSize: 13, opacity: 0.8 },
  statLabel:    { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textLight,
                  marginTop: 6, textAlign: 'center' },

  // ── Menu card ──
  cardWrapper:  { paddingHorizontal: 16, paddingVertical: 8 },
  menuRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14,
                  justifyContent: 'center', alignItems: 'center' },
  menuTextWrap: { flex: 1, marginLeft: 16 },
  menuLabel:    { fontFamily: 'Nunito_700Bold', fontSize: 16, color: C.text },
  menuSub:      { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textLight, marginTop: 3 },
  menuDivider:  { height: 1, backgroundColor: C.borderLight, marginLeft: 60, opacity: 0.8 },

  // ── Footer ──
  footer:       { flexDirection: 'row', justifyContent: 'center', paddingTop: 28 },
});

export default ProfileScreen;