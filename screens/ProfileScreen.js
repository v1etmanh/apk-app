import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ImageBackground
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
import { Plus } from 'phosphor-react-native/lib/module/icons/Plus';
import { useAppStore } from '../store/useAppStore';

import { C } from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import SectionHeader from '../components/ui/SectionHeader';

const { width: SW } = Dimensions.get('window');
const ASSETS = {
  paper: require('../assets/textures/paper_cream.png'),
  wood: require('../assets/textures/wood_light.png'),
};

const DIET_LABEL     = { omnivore:'Ăn tất cả', vegetarian:'Chay', vegan:'Thuần chay', pescatarian:'Ăn cá' };
const ACTIVITY_LABEL = { sedentary:'Ít vận động', lightly_active:'Nhẹ nhàng', moderately_active:'Vừa phải', very_active:'Nhiều vận động' };

const ProfileAvatarMark = () => (
  <Svg width={52} height={52} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="24" fill="rgba(139,94,60,0.06)" />
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

const WoodStatCard = ({ label, value, unit, hasValue, IconComponent, accentColor = 'rgba(255,220,150,0.18)' }) => (
  <ImageBackground
    source={ASSETS.wood}
    style={st.woodCell}
    imageStyle={st.woodCellImg}
    resizeMode="cover"
  >
    <View style={st.woodCellOverlay}>
      {/* Icon + label badge */}
      <View style={[st.woodIconBadge, { backgroundColor: accentColor }]}>
        <IconComponent weight="fill" size={16} color="rgba(255,248,225,0.85)" />
        <Text style={st.woodLabel} numberOfLines={1}>{label.toUpperCase()}</Text>
      </View>
      {/* Divider */}
      <View style={st.woodDivider} />
      {/* Value */}
      {hasValue ? (
        <View style={st.woodValCol}>
          <Text
            style={st.woodVal}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.4}
          >
            {value}
          </Text>
          {unit ? <Text style={st.woodUnit}>{unit}</Text> : null}
        </View>
      ) : (
        <View style={st.woodAddRow}>
          <Plus weight="bold" size={12} color="#FDF5E6" />
          <Text style={st.woodAddText}>Thêm</Text>
        </View>
      )}
    </View>
  </ImageBackground>
);

const MenuItem = ({ IconComponent, iconBg, label, sub, onPress, isLast }) => (
  <>
    <TouchableOpacity 
      style={st.menuRow} 
      onPress={onPress} 
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub || ''}`}
    >
      <View style={[st.menuIconWrap, { backgroundColor: iconBg }]}>
        <IconComponent weight="fill" size={20} color="#FFFFFF" />
      </View>
      <View style={st.menuTextWrap}>
        <Text style={st.menuLabel} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={st.menuSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <CaretRight weight="bold" size={16} color="#D1D1D6" style={{ marginRight: 4 }} />
    </TouchableOpacity>
    {!isLast && <View style={st.menuDivider} />}
  </>
);

const Avatar = () => {
  return (
    <View style={st.avatarWrap}>
      <View style={st.avatarOuterRing}>
        <View style={st.avatarInner}>
          <ProfileAvatarMark />
        </View>
      </View>
    </View>
  );
};

const ProfileScreen = ({ navigation }) => {
  const { profile, latestMetrics } = useAppStore();
  const insets = useSafeAreaInsets();

  let bmi = null, bmiLabel = '–';
  if (latestMetrics?.height_cm && latestMetrics?.weight_kg) {
    const h = latestMetrics.height_cm / 100;
    bmi = (latestMetrics.weight_kg / (h * h)).toFixed(1);
    if (latestMetrics?.weight_kg / (h * h) < 18.5) { bmiLabel = 'Thiếu cân'; }
    else if (latestMetrics?.weight_kg / (h * h) < 25)   { bmiLabel = 'Bình thường'; }
    else if (latestMetrics?.weight_kg / (h * h) < 30)   { bmiLabel = 'Thừa cân'; }
    else                 { bmiLabel = 'Béo phì'; }
  } else {
    bmiLabel = 'BMI';
  }

  const menuItems = [
    {
      IconComponent: Person, iconBg: '#007AFF', label: 'Thông tin cá nhân',
      sub: profile ? `${profile.age} tuổi · ${DIET_LABEL[profile.diet_type] || ''}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('EditPersonal'),
    },
    {
      IconComponent: Scales, iconBg: '#34C759', label: 'Chỉ số cơ thể',
      sub: latestMetrics ? `${latestMetrics.weight_kg} kg · BMI ${bmi}` : 'Chưa thiết lập',
      onPress: () => navigation.getParent()?.navigate('BodyMetrics'),
    },
    {
      IconComponent: Warning, iconBg: '#FF9500', label: 'Dị ứng & Chế độ ăn',
      sub: 'Quản lý thực phẩm cần tránh',
      onPress: () => navigation.getParent()?.navigate('Allergy'),
    },
    {
      IconComponent: ForkKnife, iconBg: '#FF3B30', label: 'Khẩu vị của tôi',
      sub: 'Sở thích hương vị cá nhân',
      onPress: () => navigation.getParent()?.navigate('TasteProfile'),
    },
  ];

  return (
    <ScreenBackground texture="paper" edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[st.scroll, { paddingTop: insets.top + 24 }]}>
        
        {/* ── Header / Profile Info ── */}
        <View style={st.headerSection}>
          <Avatar />
          <Text style={st.userName}>
            {profile?.age ? `${profile.age} tuổi` : 'Chưa thiết lập'}
          </Text>

          <View style={st.heroPills}>
            {profile?.diet_type && (
              <View style={st.heroPill}>
                <ForkKnife weight="fill" size={14} color="#8B5E3C" />
                <Text style={st.heroPillText}>{DIET_LABEL[profile.diet_type]}</Text>
              </View>
            )}
            {profile?.activity_level && (
              <View style={st.heroPill}>
                <PersonSimpleRun weight="fill" size={14} color="#8B5E3C" />
                <Text style={st.heroPillText}>{ACTIVITY_LABEL[profile.activity_level] || ACTIVITY_LABEL['lightly_active']}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={st.statsRow}>
          <WoodStatCard
            IconComponent={Scales} label="Cân nặng"
            value={latestMetrics?.weight_kg ?? '–'} unit="kg"
            hasValue={Boolean(latestMetrics?.weight_kg)}
            accentColor="rgba(100,180,255,0.2)"
          />
          <WoodStatCard
            IconComponent={Ruler} label="Chiều cao"
            value={latestMetrics?.height_cm ?? '–'} unit="cm"
            hasValue={Boolean(latestMetrics?.height_cm)}
            accentColor="rgba(160,220,130,0.2)"
          />
          <WoodStatCard
            IconComponent={ChartBar} label={bmiLabel}
            value={bmi ?? '–'} unit=""
            hasValue={Boolean(bmi)}
            accentColor="rgba(255,180,100,0.22)"
          />
        </View>

        {/* ── Settings Menu ── */}
        <SectionHeader title="Thiết lập ⚙️🛠️" style={st.sectionHeader} titleStyle={st.sectionTitle} />

        <View style={st.menuGroup}>
          {menuItems.map((item, i) => (
            <MenuItem
              key={item.label}
              {...item}
              isLast={i === menuItems.length - 1}
            />
          ))}
        </View>

        <View style={st.footer}>
          <PawPrint weight="fill" size={24} color={C.border} style={{ opacity: 0.6, marginRight: 8 }} />
          <PawPrint weight="fill" size={24} color={C.border} style={{ opacity: 0.3 }} />
        </View>

        <View style={{ height: 40 }}/>
      </ScrollView>
    </ScreenBackground>
  );
};

const st = StyleSheet.create({
  scroll: { paddingHorizontal: 16 },

  // ── Header Section ──
  headerSection: { alignItems: 'center', marginBottom: 28 },
  
  // ── Avatar ──
  avatarWrap: { marginBottom: 16 },
  avatarOuterRing: { 
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 
  },
  avatarInner: { 
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: '#FDFBFA', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.borderLight
  },

  // ── User Name & Pills ──
  userName: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: C.text, marginBottom: 14, textAlign: 'center' },
  heroPills: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap', paddingHorizontal: 20 },
  heroPill: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: C.borderLight
  },
  heroPillText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: C.textMid },

  // ── Stats Row (Dark Wood) ──
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  woodCell: {
    flex: 1,
    height: 118,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(160,120,74,0.3)',
    shadowColor: '#2A1500',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 7,
  },
  woodCellImg: { borderRadius: 18, opacity: 0.88 },
  woodCellOverlay: {
    backgroundColor: 'rgba(15,7,2,0.32)',
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 13,
    justifyContent: 'space-between',
  },
  woodIconBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  woodDivider: {
    height: 1,
    backgroundColor: 'rgba(255,240,200,0.12)',
    marginVertical: 7,
    marginHorizontal: -2,
  },
  woodLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: '#FDF5E6',
    opacity: 0.85,
    letterSpacing: 0.6,
  },
  woodValCol: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  woodVal: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: '#FFF9EB',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  woodUnit: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
    color: '#FDF5E6',
    opacity: 0.55,
    marginTop: 1,
    letterSpacing: 0.3,
  },
  woodAddRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 4 },
  woodAddText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#FDF5E6' },

  // ── Section Header ──
  sectionHeader: { marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: C.text },

  // ── iOS Style Menu Group ──
  menuGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)'
  },
  menuRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 68
  },
  menuIconWrap: { 
    width: 36, height: 36, 
    borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  menuTextWrap: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  menuLabel: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: C.text, marginBottom: 2 },
  menuSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#8E8E93' },
  menuDivider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 66 },

  // ── Footer ──
  footer: { flexDirection: 'row', justifyContent: 'center', paddingTop: 40 },
});

export default ProfileScreen;
