import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ImageBackground, Animated, Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';
import { useAppStore } from '../store/useAppStore';

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  paper:     '#F5EDD6',
  paperDeep: '#EDE0C4',
  paperMid:  '#F0E4C8',
  ink:       '#3D2B1F',
  inkLight:  '#7B5B3A',
  wood:      '#C8A97E',
  woodDark:  '#9B7355',
  woodDeep:  '#7A5535',
  dashed:    '#C4B49A',
  white:     '#FFFEF9',
  skyBlue:   '#A8CEDF',
  mint:      '#A8D5B5',
  amber:     '#E8C547',
  rose:      '#E8A598',
  statBlue:  '#6BAED6',
  statGreen: '#74C476',
  statAmber: '#E8A020',
  statRed:   '#D45F5F',
};
const { width: SW } = Dimensions.get('window');

// ─── Labels ───────────────────────────────────────────────────────
const DIET_LABEL     = { omnivore:'Ăn tất cả', vegetarian:'Chay', vegan:'Thuần chay', pescatarian:'Ăn cá' };
const ACTIVITY_LABEL = { sedentary:'Ít vận động', lightly_active:'Nhẹ nhàng', moderately_active:'Vừa phải', very_active:'Nhiều vận động' };
const GENDER_ICON    = { male:'👨', female:'👩', other:'🧑' };

// ─── Wobbly SVG Border ────────────────────────────────────────────
const WobblyBorder = ({ width, height, color = C.dashed, sw = 1.8, dash = '5,4' }) => {
  const r = 18, w = width, h = height;
  const p = `M${r},3 Q${w*.5},1 ${w-r},4 Q${w-3},3 ${w-3},${r} Q${w-1},${h*.5} ${w-3},${h-r} Q${w-2},${h-2} ${w-r+2},${h-3} Q${w*.5},${h-1} ${r-1},${h-3} Q2,${h-2} 3,${h-r} Q1,${h*.5} 3,${r} Q2,2 ${r},3 Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={p} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={dash} strokeLinecap="round"/>
    </Svg>
  );
};

// ─── Section divider ──────────────────────────────────────────────
const SectionDivider = ({ label }) => (
  <View style={st.sectionRow}>
    <View style={st.sectionLine}/>
    <View style={st.sectionBadge}>
      <Text style={st.sectionText}>✦ {label} ✦</Text>
    </View>
    <View style={st.sectionLine}/>
  </View>
);

// ─── Stat Card ────────────────────────────────────────────────────
const StatCard = ({ label, value, unit, color, emoji }) => (
  <View style={st.statCard}>
    <WobblyBorder width={(SW - 56) / 3} height={88} color={color} sw={2}/>
    <Text style={st.statEmoji}>{emoji}</Text>
    <Text style={[st.statValue, { color }]}>{value}</Text>
    {unit ? <Text style={[st.statUnit, { color }]}>{unit}</Text> : null}
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

// ─── Menu Item ────────────────────────────────────────────────────
const MenuItem = ({ icon, iconBg, label, sub, onPress, isLast }) => (
  <>
    <TouchableOpacity style={st.menuRow} onPress={onPress} activeOpacity={0.75}>
      {/* Icon stamp */}
      <View style={[st.menuIconWrap, { backgroundColor: iconBg || C.paperDeep }]}>
        <Text style={st.menuIcon}>{icon}</Text>
      </View>

      <View style={st.menuTextWrap}>
        <Text style={st.menuLabel}>{label}</Text>
        {sub ? <Text style={st.menuSub} numberOfLines={1}>{sub}</Text> : null}
      </View>

      {/* Arrow */}
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Path d="M7 5 L13 10 L7 15" stroke={C.dashed} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </Svg>
    </TouchableOpacity>

    {/* Wavy divider between items */}
    {!isLast && (
      <Svg width={SW - 56} height={8} style={st.menuDividerSvg}>
        <Path
          d={`M0,4 Q${(SW-56)*0.2},1 ${(SW-56)*0.4},4 Q${(SW-56)*0.6},7 ${(SW-56)*0.8},4 Q${(SW-56)*0.9},2 ${SW-56},4`}
          fill="none" stroke={C.dashed} strokeWidth={1} strokeDasharray="3,3"/>
      </Svg>
    )}
  </>
);

// ─── Animated Avatar ──────────────────────────────────────────────
const Avatar = ({ gender }) => {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -6, duration: 1200, useNativeDriver: false }),
      Animated.timing(bob, { toValue:  0, duration: 1200, useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <Animated.View style={[st.avatarWrap, { transform: [{ translateY: bob }] }]}>
      {/* Outer glow ring */}
      <View style={st.avatarGlow}/>
      {/* Wood ring */}
      <View style={st.avatarRing}>
        <View style={st.avatarInner}>
          <Text style={st.avatarEmoji}>{GENDER_ICON[gender] || '👤'}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const { profile, latestMetrics } = useAppStore();

  // BMI
  let bmi = null, bmiColor = C.statBlue, bmiLabel = '–';
  if (latestMetrics?.height_cm && latestMetrics?.weight_kg) {
    const h = latestMetrics.height_cm / 100;
    bmi = (latestMetrics.weight_kg / (h * h)).toFixed(1);
    if      (bmi < 18.5) { bmiColor = C.statBlue;  bmiLabel = 'Thiếu cân'; }
    else if (bmi < 25)   { bmiColor = C.statGreen;  bmiLabel = 'Bình thường'; }
    else if (bmi < 30)   { bmiColor = C.statAmber;  bmiLabel = 'Thừa cân'; }
    else                 { bmiColor = C.statRed;     bmiLabel = 'Béo phì'; }
  }

  const menuItems = [
    {
      icon: '👤', iconBg: '#D4EDF7', label: 'Thông tin cá nhân',
      sub: profile ? `${profile.age} tuổi · ${DIET_LABEL[profile.diet_type] || ''}` : 'Chưa có dữ liệu',
      onPress: () => navigation.getParent()?.navigate('EditPersonal'),
    },
    {
      icon: '⚖️', iconBg: '#D4EDC4', label: 'Chỉ số cơ thể',
      sub: latestMetrics ? `${latestMetrics.weight_kg} kg · BMI ${bmi}` : 'Chưa có dữ liệu',
      onPress: () => navigation.getParent()?.navigate('BodyMetrics'),
    },
    {
      icon: '⚠️', iconBg: '#F5E0C4', label: 'Dị ứng & Chế độ ăn',
      sub: 'Quản lý thực phẩm cần tránh',
      onPress: () => navigation.getParent()?.navigate('Allergy'),
    },
    {
      icon: '👅', iconBg: '#F0D4ED', label: 'Khẩu vị của tôi',
      sub: 'Sở thích hương vị cá nhân',
      onPress: () => navigation.getParent()?.navigate('TasteProfile'),
    },
  ];

  return (
    <ImageBackground
      source={require('../assets/textures/paper_cream.png')}
      style={st.root} resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent/>

      {/* ── Sky watercolor hero ── */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={st.hero} resizeMode="cover"
        imageStyle={{ opacity: 0.55 }}
      >
        {/* Decorative floating circles */}
        <View style={[st.deco, { width: 90, height: 90, top: 20, right: 24, opacity: 0.12 }]}/>
        <View style={[st.deco, { width: 55, height: 55, top: 60, left: 10,  opacity: 0.10 }]}/>
        <View style={[st.deco, { width: 40, height: 40, bottom: 30, right: 60, opacity: 0.08 }]}/>

        {/* Avatar */}
        <Avatar gender={profile?.gender}/>

        {/* Age */}
        <Text style={st.heroAge}>
          {profile?.age ? `${profile.age} tuổi` : 'Chưa thiết lập'}
        </Text>

        {/* Diet + Activity pills */}
        <View style={st.heroPills}>
          {profile?.diet_type && (
            <View style={st.heroPill}>
              <Text style={st.heroPillText}>
                🍽 {DIET_LABEL[profile.diet_type]}
              </Text>
            </View>
          )}
          {profile?.activity_level && (
            <View style={[st.heroPill, { backgroundColor: 'rgba(168,213,181,0.65)' }]}>
              <Text style={st.heroPillText}>
                🏃 {ACTIVITY_LABEL[profile.activity_level]}
              </Text>
            </View>
          )}
        </View>

        {/* Wavy bottom edge */}
        <Svg width={SW} height={24} style={st.wave}>
          <Path
            d={`M0,8 Q${SW*.13},22 ${SW*.27},10 Q${SW*.41},0 ${SW*.55},12 Q${SW*.69},22 ${SW*.83},9 Q${SW*.91},2 ${SW},10 L${SW},24 L0,24 Z`}
            fill={C.paper}/>
        </Svg>
      </ImageBackground>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {/* ── Stats row ── */}
        <View style={st.statsRow}>
          <StatCard
            emoji="⚖️" label="Cân nặng"
            value={latestMetrics?.weight_kg ?? '–'} unit="kg"
            color={C.statBlue}
          />
          <StatCard
            emoji="📏" label="Chiều cao"
            value={latestMetrics?.height_cm ?? '–'} unit="cm"
            color={C.woodDark}
          />
          <StatCard
            emoji="💡" label={bmiLabel}
            value={bmi ?? '–'} unit=""
            color={bmiColor}
          />
        </View>

        {/* ── Menu section ── */}
        <SectionDivider label="hồ sơ của tôi"/>

        <View style={st.menuCard}>
          <WobblyBorder width={SW - 32} height={menuItems.length * 73} color={C.wood} sw={2}/>
          {menuItems.map((item, i) => (
            <MenuItem
              key={item.label}
              {...item}
              isLast={i === menuItems.length - 1}
            />
          ))}
        </View>

        {/* ── Footer cat paw ── */}
        <View style={st.footer}>
          <Text style={st.footerPaw}>🐾 🐾</Text>
        </View>

        <View style={{ height: 36 }}/>
      </ScrollView>
    </ImageBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },

  // ── Hero ──
  hero:         { paddingTop: 52, paddingBottom: 0, alignItems: 'center',
                  backgroundColor: C.skyBlue, overflow: 'hidden' },
  deco:         { position: 'absolute', borderRadius: 999,
                  backgroundColor: C.woodDark },
  wave:         { marginTop: 8 },

  // ── Avatar ──
  avatarWrap:   { marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
  avatarGlow:   { position: 'absolute', width: 106, height: 106, borderRadius: 53,
                  backgroundColor: 'rgba(200,169,126,0.25)' },
  avatarRing:   { width: 92, height: 92, borderRadius: 46,
                  backgroundColor: C.wood, justifyContent: 'center', alignItems: 'center',
                  shadowColor: C.woodDeep, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  avatarInner:  { width: 78, height: 78, borderRadius: 39,
                  backgroundColor: C.white, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji:  { fontSize: 44 },

  // ── Hero text ──
  heroAge:      { fontFamily: 'Patrick Hand', fontSize: 30, color: C.ink },
  heroPills:    { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 4,
                  flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 },
  heroPill:     { backgroundColor: 'rgba(200,169,126,0.55)', borderRadius: 9999,
                  paddingHorizontal: 14, paddingVertical: 6 },
  heroPillText: { fontFamily: 'Nunito', fontSize: 13, color: C.ink, fontWeight: '700' },

  // ── Scroll ──
  scroll: { paddingHorizontal: 16, paddingTop: 10 },

  // ── Stats row ──
  statsRow:     { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 4 },
  statCard:     { flex: 1, backgroundColor: C.white, borderRadius: 18,
                  paddingVertical: 12, alignItems: 'center',
                  shadowColor: C.woodDark, shadowOffset: { width: 1, height: 3 },
                  shadowOpacity: 0.09, shadowRadius: 5, elevation: 2 },
  statEmoji:    { fontSize: 16, marginBottom: 2 },
  statValue:    { fontFamily: 'Patrick Hand', fontSize: 22, lineHeight: 26 },
  statUnit:     { fontFamily: 'Nunito', fontSize: 11, fontWeight: '700', opacity: 0.75 },
  statLabel:    { fontFamily: 'Nunito', fontSize: 11, color: C.inkLight,
                  fontWeight: '600', marginTop: 3, textAlign: 'center' },

  // ── Section divider ──
  sectionRow:   { flexDirection: 'row', alignItems: 'center',
                  marginTop: 16, marginBottom: 12 },
  sectionLine:  { flex: 1, height: 1, backgroundColor: C.dashed },
  sectionBadge: { backgroundColor: C.paperDeep, borderRadius: 9999,
                  paddingHorizontal: 14, paddingVertical: 5, marginHorizontal: 8 },
  sectionText:  { fontFamily: 'Patrick Hand', fontSize: 14,
                  color: C.inkLight, letterSpacing: 1 },

  // ── Menu card ──
  menuCard:     { backgroundColor: C.white, borderRadius: 22,
                  paddingVertical: 4, paddingHorizontal: 16,
                  shadowColor: C.woodDark, shadowOffset: { width: 2, height: 4 },
                  shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },

  // ── Menu item ──
  menuRow:      { flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 14 },
  menuIconWrap: { width: 44, height: 44, borderRadius: 14,
                  justifyContent: 'center', alignItems: 'center' },
  menuIcon:     { fontSize: 22 },
  menuTextWrap: { flex: 1, marginLeft: 12 },
  menuLabel:    { fontFamily: 'Patrick Hand', fontSize: 17, color: C.ink },
  menuSub:      { fontFamily: 'Nunito', fontSize: 12, color: C.inkLight,
                  fontWeight: '600', marginTop: 2 },
  menuDividerSvg: { marginLeft: 4, marginBottom: 2 },

  // ── Footer ──
  footer:       { alignItems: 'center', paddingTop: 20 },
  footerPaw:    { fontSize: 20, opacity: 0.4 },
});

export default ProfileScreen;