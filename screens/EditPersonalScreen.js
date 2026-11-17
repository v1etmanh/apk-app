/**
 * EditPersonalScreen — Redesigned
 * Phong cách: Studio Ghibli × Handdrawn Game Notebook
 *
 * Deps cần cài:
 *   yarn add react-native-svg lottie-react-native
 *
 * Assets cần có:
 *   assets/textures/paper_cream.png
 *   assets/textures/wood_light.png
 *   assets/textures/sky_watercolor.png
 *   assets/animations/meo_ma.json
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ImageBackground, Image,
  Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { CaretRight } from 'phosphor-react-native/lib/module/icons/CaretRight';
import { GenderMale } from 'phosphor-react-native/lib/module/icons/GenderMale';
import { GenderFemale } from 'phosphor-react-native/lib/module/icons/GenderFemale';
import { GenderNeuter } from 'phosphor-react-native/lib/module/icons/GenderNeuter';
import { ForkKnife } from 'phosphor-react-native/lib/module/icons/ForkKnife';
import { Leaf } from 'phosphor-react-native/lib/module/icons/Leaf';
import { Plant } from 'phosphor-react-native/lib/module/icons/Plant';
import { Fish } from 'phosphor-react-native/lib/module/icons/Fish';
import { Scales } from 'phosphor-react-native/lib/module/icons/Scales';
import { TrendDown } from 'phosphor-react-native/lib/module/icons/TrendDown';
import { Barbell } from 'phosphor-react-native/lib/module/icons/Barbell';
import { FlowerLotus } from 'phosphor-react-native/lib/module/icons/FlowerLotus';
import { Armchair } from 'phosphor-react-native/lib/module/icons/Armchair';
import { PersonSimpleWalk } from 'phosphor-react-native/lib/module/icons/PersonSimpleWalk';
import { PersonSimpleRun } from 'phosphor-react-native/lib/module/icons/PersonSimpleRun';
import { Lightning } from 'phosphor-react-native/lib/module/icons/Lightning';
import { Cake } from 'phosphor-react-native/lib/module/icons/Cake';
import { Target } from 'phosphor-react-native/lib/module/icons/Target';
import { IdentificationBadge } from 'phosphor-react-native/lib/module/icons/IdentificationBadge';
import { BowlFood } from 'phosphor-react-native/lib/module/icons/BowlFood';
import { Sparkle } from 'phosphor-react-native/lib/module/icons/Sparkle';

import { loadProfileById, saveProfileMember } from '../utils/database';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:       '#3B2A1A',
  inkLight:  '#6B4F35',
  paper:     '#FAF3E0',
  cream:     '#F5E6C8',
  blue:      '#7BAFD4',
  blueDark:  '#4A8BB5',
  green:     '#8DB87A',
  rose:      '#D4837A',
  stamp:     '#C8956A',
  border:    '#C4A882',
  white:     '#FFFEF8',
  overlay:   'rgba(59,42,26,0.08)',
};

// ─── Options ──────────────────────────────────────────────────────────────────
// Đúng các lựa chọn của onboarding (không còn tuổi / mục tiêu / vận động / bệnh lý)
const GENDER_OPTS   = [{ key:'male',   Icon: GenderMale,   text:'Nam'       },
                       { key:'female', Icon: GenderFemale, text:'Nữ'        }];
const DIET_OPTS     = [{ key:'omnivore',    Icon: ForkKnife, text:'Ăn mặn'     },
                       { key:'vegetarian', Icon: Leaf,      text:'Ăn chay'     },
                       { key:'vegan',      Icon: Plant,     text:'Thuần chay'  }];
const REGION_OPTS   = [{ key:'northern', emoji:'🏞️' }, { key:'central', emoji:'🌶️' },
                       { key:'southern', emoji:'🥥' }, { key:'national', emoji:'🇻🇳' },
                       { key:'other', emoji:'🌏' }];
const GOAL_OPTS     = [{ key:'maintenance', Icon: Scales,      text:'Duy trì'   },
                       { key:'weight_loss', Icon: TrendDown,   text:'Giảm cân'  },
                       { key:'muscle_gain', Icon: Barbell,     text:'Tăng cơ'   },
                       { key:'detox',       Icon: FlowerLotus, text:'Detox'      }];
const ACTIVITY_OPTS = [{ key:'sedentary',         Icon: Armchair,         text:'Ít vận động' },
                       { key:'lightly_active',    Icon: PersonSimpleWalk, text:'Nhẹ nhàng'   },
                       { key:'moderately_active', Icon: PersonSimpleRun,  text:'Vừa phải'    },
                       { key:'very_active',       Icon: Lightning,        text:'Nhiều'       }];
const HEALTH_OPTS = [
  { key: 'none',          Icon: Sparkle,      text: 'Bình thường'  },
  { key: 'diabetes',      Icon: FlowerLotus,  text: 'Tiểu đường'   },
  { key: 'hypertension',  Icon: Lightning,    text: 'Huyết áp cao' },
  { key: 'gout',          Icon: Scales,       text: 'Gout'         },
];
// ─── Wobbly border SVG (giả lập nét bút tay) ─────────────────────────────────
const WobblyFrame = ({ width, height, color = C.border, strokeWidth = 2.5 }) => {
  const p = 6; // padding cho wobble
  const r = 18;
  const w = width - p * 2;
  const h = height - p * 2;
  // Tạo path rounded-rect hơi "run tay"
  const path = `
    M ${p + r + 2},${p - 1}
    Q ${p + w / 3},${p + 3} ${p + w - r},${p + 1}
    Q ${p + w + 2},${p} ${p + w + 1},${p + r}
    Q ${p + w + 3},${p + h / 2} ${p + w + 1},${p + h - r + 1}
    Q ${p + w},${p + h + 2} ${p + w - r - 1},${p + h + 1}
    Q ${p + w / 2 - 5},${p + h - 3} ${p + r},${p + h}
    Q ${p - 1},${p + h + 1} ${p},${p + h - r}
    Q ${p - 3},${p + h / 2 + 5} ${p + 1},${p + r + 1}
    Q ${p},${p - 2} ${p + r + 2},${p - 1}
    Z
  `;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Section label với dấu ♦ ─────────────────────────────────────────────────
const SectionLabel = ({ text, Icon }) => (
  <View style={st.labelRow}>
    {Icon && <Icon weight="bold" size={18} color={C.stamp} style={{ marginRight: 6 }} />}
    <Text style={st.blockLabel}>{text}</Text>
  </View>
);

// ─── Stamp Chip ───────────────────────────────────────────────────────────────
const StampChip = ({ Icon, text, active, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ marginRight: 8, marginBottom: 8 }}>
    <View style={[st.chip, active && st.chipActive]}>
      {Icon ? (
        <Icon 
          weight={active ? "fill" : "bold"} 
          size={16} 
          color={active ? C.blueDark : C.inkLight} 
          style={{ marginRight: 5 }} 
        />
      ) : null}
      <Text style={[st.chipText, active && st.chipTextActive]}>{text}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Chip group ───────────────────────────────────────────────────────────────
const ChipGroup = ({ label, Icon, options, value, onChange, translationPath }) => {
  const { t } = useTranslation();
  return (
  <View style={st.block}>
    <SectionLabel text={label} Icon={Icon} />
    <View style={st.chips}>
      {options.map(o => (
        <StampChip key={o.key} Icon={o.Icon} text={translationPath ? t(translationPath + '.' + o.key) : t('onboarding.diet.diets.' + o.key + '.label', { defaultValue: o.text })}
          active={value === o.key} onPress={() => onChange(o.key)} />
      ))}
    </View>
  </View>
  );
};

// ─── Card wrapper với wobbly frame ────────────────────────────────────────────
const NoteCard = ({ children, style }) => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View style={[st.card, style]}
      onLayout={e => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <ImageBackground
        source={require('../assets/textures/paper_cream.png')}
        style={StyleSheet.absoluteFill}
        imageStyle={{ borderRadius: 14, opacity: 0.85 }}
        resizeMode="cover"
      />
      {size.w > 0 && <WobblyFrame width={size.w} height={size.h} />}
      <View style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </View>
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const EditPersonalScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [gender, setGender]     = useState(null);
  const [dietType, setDietType] = useState('omnivore');
  const [region, setRegion]     = useState('national');
  const [saving, setSaving]     = useState(false);
  const { profile, activeProfileId, switchProfile } = useAppStore();
  const lottieRef = useRef(null);

  const applyProfile = (p) => {
    if (!p) return;
    setGender(p.gender === 'female' || p.gender === 'male' ? p.gender : null);
    setDietType(['omnivore', 'vegetarian', 'vegan'].includes(p.diet_type) ? p.diet_type : 'omnivore');
    setRegion(p.nation === 'other' ? 'other' : (p.home_region || 'national'));
  };

  useEffect(() => {
    if (!activeProfileId) return;
    if (profile) applyProfile(profile);
    else loadProfileById(activeProfileId).then(applyProfile).catch(console.error);
  }, [activeProfileId]);

  const handleSave = async () => {
    let profileId = activeProfileId;
    if (!profileId) {
      const { getActiveProfileId } = await import('../utils/database');
      profileId = await getActiveProfileId();
    }
    if (!profileId) {
      Alert.alert(t('personal.missing'), t('personal.missingBody'));
      return;
    }

    setSaving(true);
    lottieRef.current?.play();
    try {
      await saveProfileMember({
        profileId,
        ...(gender ? { gender } : {}),
        diet_type:   dietType,
        nation:      region === 'other' ? 'other' : 'vietnam',
        home_region: region === 'other' ? 'national' : region,
        updated_at:  new Date().toISOString(),
      });
      // Nạp lại toàn bộ hồ sơ vào store (không ghi đè các field khác)
      await switchProfile(profileId);
      Alert.alert(t('personal.saved'), t('personal.savedBody'));
      navigation.goBack();
    } catch (e) {
      console.error('[EditPersonal] handleSave error:', e?.message, e);
      Alert.alert(t('personal.error'), t('personal.errorBody'));
    } finally { setSaving(false); }
  };

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Background — sky watercolor */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* Paper overlay */}
      <View style={st.paperOverlay} />

      {/* ── Header ── */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={st.backBtn} 
          onPress={() => navigation.goBack()} 
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <View style={st.backBtnInner}>
            <CaretRight weight="bold" size={22} color={C.ink} style={{ transform: [{ rotate: '180deg' }] }} />
          </View>
        </TouchableOpacity>

        <View style={st.titleWrap}>
          <Text style={st.navTitle} numberOfLines={1}>{t('personal.title')}</Text>
          <View style={st.titleUnderline} />
        </View>

        <View style={st.mascotWrap}>
          <LottieView
            ref={lottieRef}
            source={require('../assets/animations/Cattr.json')}
            autoPlay loop
            speed={0.6}
            style={st.mascot}
          />
        </View>
      </View>

      {/* ── Scroll content ── */}
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Gender */}
        <NoteCard style={st.cardSpacing}>
          <View style={st.cardPad}>
            <ChipGroup label={t('personal.gender')} Icon={IdentificationBadge} options={GENDER_OPTS} value={gender} onChange={setGender} translationPath="onboarding.body" />
          </View>
        </NoteCard>

        {/* Diet */}
        <NoteCard style={st.cardSpacing}>
          <View style={st.cardPad}>
            <ChipGroup label={t('personal.diet')} Icon={BowlFood} options={DIET_OPTS} value={dietType} onChange={setDietType} />
          </View>
        </NoteCard>

        {/* Region */}
        <NoteCard style={st.cardSpacing}>
          <View style={st.cardPad}>
            <SectionLabel text={t('profileScreen.regionLabel')} Icon={Target} />
            <View style={st.chips}>
              {REGION_OPTS.map(o => (
                <StampChip
                  key={o.key}
                  text={`${o.emoji} ${o.key === 'other'
                    ? t('onboarding.region.nations.other')
                    : t('onboarding.region.regions.' + o.key + '.label')}`}
                  active={region === o.key}
                  onPress={() => setRegion(o.key)}
                />
              ))}
            </View>
          </View>
        </NoteCard>

        {/* ── Save button (wood texture) ── */}
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.82} style={st.saveBtnWrap}>
          <ImageBackground
              source={require('../assets/textures/wood_light.png')}
              style={st.saveBtn}
              imageStyle={{ borderRadius: 20, opacity: 0.9 }}
              resizeMode="cover"
            >
              {/* wobbly border for button */}
              <WobblyFrame width={SW - 40} height={60} color="#8B5E3C" strokeWidth={2} />
              <View style={st.saveBtnContent}>
                <Text style={st.saveBtnText}>
                  {saving ? t('personal.saving') : t('personal.save')}
                </Text>
              </View>
            </ImageBackground>
        </TouchableOpacity>

        {/* Bottom deco */}
        <View style={st.bottomDeco}>
          <Text style={st.decoText}>❧ ✿ ❧</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.paper,
  },
  paperOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(250,243,224,0.55)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  backBtn: { 
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtnInner: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
    ...Platform.select({
      ios: {
        shadowColor: C.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: '0 2px 4px rgba(59, 42, 26, 0.1)',
      }
    }),
  },
  titleWrap: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: C.ink,
    letterSpacing: 0.2,
  },
  titleUnderline: {
    width: 40, height: 3, borderRadius: 2,
    backgroundColor: C.stamp, marginTop: 4,
    opacity: 0.4,
  },
  mascotWrap: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  mascot: {
    width: 56, height: 56,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Card
  card: {
    borderRadius: 14,
    backgroundColor: C.white,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: C.ink, shadowOffset:{width:0,height:3}, shadowOpacity:0.1, shadowRadius:8 },
      android: { elevation: 3 },
      web: { boxShadow: '0 3px 8px rgba(59, 42, 26, 0.1)' }
    }),
  },
  cardPad: { padding: 16 },
  cardSpacing: { marginBottom: 14 },

  // Label
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  blockLabel: {
    fontSize: 17, fontFamily: 'Nunito-Bold', color: C.ink, letterSpacing: 0.2,
  },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 8,
    borderWidth: 1.5, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.ink, shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: '1px 2px 3px rgba(59, 42, 26, 0.1)' }
    }),
  },
  chipActive: {
    backgroundColor: '#EBF4FF',
    borderColor: C.blue,
  },
  chipText: {
    fontSize: 13, color: C.inkLight, fontFamily: 'Nunito_600SemiBold',
  },
  chipTextActive: {
    color: C.blueDark, fontFamily: 'Nunito-Bold',
  },

  // Age stepper
  ageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  stepper: {},
  stepInner: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.ink, shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '1px 2px 4px rgba(59, 42, 26, 0.12)' }
    }),
  },
  stepIcon: {
    fontSize: 22, color: C.stamp, fontFamily: 'Nunito-Bold', lineHeight: 26,
  },
  ageInputWrap: { alignItems: 'center' },
  ageInput: {
    width: 88, height: 60,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 2, borderColor: C.blue,
    fontSize: 32, fontFamily: 'Nunito-Bold', color: C.ink,
    textAlign: 'center',
  },
  ageUnit: {
    fontSize: 14, color: C.inkLight, fontFamily: 'Nunito_600SemiBold', marginTop: 4,
  },

  // Save button
  saveBtnWrap: {
    marginTop: 6,
    ...Platform.select({
      ios: { shadowColor: C.ink, shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 5 },
      web: { boxShadow: '2px 4px 8px rgba(59, 42, 26, 0.2)' }
    }),
  },
  saveBtn: {
    width: SW - 40, height: 60,
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  saveBtnContent: {
    position: 'absolute',
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(139,94,60,0.18)',
    borderRadius: 20,
  },
  saveBtnText: {
    fontSize: 20, fontFamily: 'Nunito-Bold', color: '#3B2A1A',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom deco
  bottomDeco: { alignItems: 'center', marginTop: 20 },
  decoText: { fontSize: 20, color: C.stamp, opacity: 0.6, letterSpacing: 6 },
});

export default EditPersonalScreen;
