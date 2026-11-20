/**
 * ProfileScreen.js — Hồ sơ cá nhân
 * Design: giấy kem + nâu gỗ (Lora display + BeVietnamPro body), gọn & dễ đọc.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '../store/useAppStore';
import { deleteProfileMember, loadAllergiesForProfile } from '../utils/database';
import { tasteSummary } from '../utils/tasteMath';
import { removeMealPlanByProfileId } from '../services/mealPlanService';
import ProfileAvatar, { useProfileYear } from '../components/ui/ProfileAvatar';
import { getProfileAge, MAX_FAMILY_MEMBERS } from '../utils/profileIdentity';
import ScreenBackground from '../components/ui/ScreenBackground';
import SkyHeader from '../components/ui/SkyHeader';
import SegmentTabs, { TabPanel } from '../components/ui/SegmentTabs';
import AnimatedAppIcon from '../components/ui/AnimatedAppIcon';

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg: '#F6EEDD', header: '#FBF5E8', card: '#FFFAF0',
  border: '#E4D3B0', divider: '#EFE3C6',
  ink: '#3D2B1F', muted: '#7A6448', brown: '#5C3A1E', accent: '#7A4E24',
  cream: '#FFF8EA', gold: '#E9D6A9', dashed: '#C8A96E', danger: '#A5372A',
};

const TONES = [
  { bg: '#E9DDBF', ring: '#8B5E3C', ink: '#5C3A1E' },
  { bg: '#DCE6EE', ring: '#5E7C94', ink: '#34506A' },
  { bg: '#F3DDD3', ring: '#B0705A', ink: '#7A3F2B' },
  { bg: '#DCE8C8', ring: '#6B8A4E', ink: '#3F5A2B' },
];

const TASTE_COLOR = {
  spicy: '#B5452E', sweet: '#C28A2B', sour: '#5F7A47', salty: '#5E7C94',
  umami: '#8A5A3C', bitter: '#6B5B3E', astringent: '#7A6A9A',
};

const nativeShadow = (color = '#8B5E3C', opacity = 0.12, radius = 12, offset = { width: 0, height: 6 }, elevation = 3) =>
  Platform.select({
    ios:     { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: offset },
    android: { elevation },
  });

// ── Chip (hero) ──────────────────────────────────────────────────────────────
const Chip = ({ icon, label }) => (
  <View style={ch.wrap}>
    <Ionicons name={icon} size={14} color={P.brown} />
    <Text style={ch.text}>{label}</Text>
  </View>
);

// ── Metric column (thẻ chỉ số) ───────────────────────────────────────────────
const Metric = ({ label, value, unit }) => (
  <View style={mt.col}>
    <Text style={mt.label} numberOfLines={1}>{label.toUpperCase()}</Text>
    <Text style={mt.value} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.6}>{value}</Text>
    <Text style={mt.unit} numberOfLines={1}>{unit || ' '}</Text>
  </View>
);

// ── Food row ─────────────────────────────────────────────────────────────────
const FoodRow = ({ icon, iconName, iconBg, iconColor, iconTrigger, iconDelay = 0, label, isLast, children }) => (
  <View style={[fr.row, !isLast && fr.rowBorder]}>
    <View style={[fr.icon, { backgroundColor: iconBg }]}>
      <AnimatedAppIcon
        name={iconName}
        size={31}
        trigger={iconTrigger}
        playOnVisible
        delay={iconDelay}
        fallback={<Ionicons name={icon} size={18} color={iconColor} />}
      />
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={fr.label}>{label}</Text>
      {children}
    </View>
  </View>
);

// ── MemberRow ────────────────────────────────────────────────────────────────
const MemberRow = ({ p, tone, isActive, canDelete, onPress, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const year = useProfileYear();
  const age = getProfileAge(p, year);
  const name = p.displayName || t('profiles.unnamed');
  return (
    <TouchableOpacity
      style={[mr.row, isActive && mr.rowActive]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[mr.avatar, { backgroundColor: tone.bg, borderColor: tone.ring }]}>
        <ProfileAvatar profile={p} size={44} animated={isActive} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mr.name} numberOfLines={1}>{name}</Text>
        <Text style={mr.sub} numberOfLines={1}>
          {t('profiles.' + (p.relation || 'other'), { defaultValue: t('profiles.other') })}{age !== null ? ' · ' + t('profiles.years', { count: age }) : ''}
        </Text>
      </View>

      {isActive && (
        <View style={mr.activePill}>
          <Text style={mr.activePillText}>{t('profileScreen.inUse')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={mr.iconBtn}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={t('profileScreen.editMember', { name })}
      >
        <Ionicons name="pencil-outline" size={18} color={P.muted} />
      </TouchableOpacity>
      {canDelete && !isActive && (
        <TouchableOpacity
          style={mr.iconBtn}
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={t('profileScreen.deleteMember', { name })}
        >
          <Ionicons name="trash-outline" size={18} color={P.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ── MenuItem ─────────────────────────────────────────────────────────────────
const MenuItem = ({ icon, iconName, iconBg, iconColor, iconTrigger, iconDelay = 0, label, sub, onPress, isLast }) => {
  const [pressTrigger, setPressTrigger] = useState(0);
  return (
    <TouchableOpacity
      style={[mi.row, !isLast && mi.rowBorder]}
      onPress={() => { setPressTrigger(value => value + 1); onPress?.(); }}
      activeOpacity={0.72}
    >
      <View style={[mi.iconBox, { backgroundColor: iconBg }]}>
        <AnimatedAppIcon
          name={iconName}
          size={34}
          trigger={`${iconTrigger}:${pressTrigger}`}
          playOnVisible
          delay={iconDelay}
          fallback={<Ionicons name={icon} size={19} color={iconColor} />}
        />
      </View>
      <View style={mi.textWrap}>
        <Text style={mi.label} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={mi.sub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={P.muted} />
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, latestMetrics, profiles, activeProfileId, switchProfile, loadAllProfilesAction, tasteProfile } = useAppStore();
  const [allergyRows, setAllergyRows] = useState([]);
  const [tab, setTab] = useState(0); // 0 ăn uống · 1 gia đình · 2 thiết lập
  const [screenIconTrigger, setScreenIconTrigger] = useState(0);
  const [tabIconTrigger, setTabIconTrigger] = useState(0);
  const year = useProfileYear();
  const atCapacity = profiles.length >= MAX_FAMILY_MEMBERS;

  useFocusEffect(useCallback(() => { loadAllProfilesAction(); }, []));
  useFocusEffect(useCallback(() => {
    setScreenIconTrigger(value => value + 1);
  }, []));

  // Dị ứng của hồ sơ đang chọn (cần display_name cho nguyên liệu cụ thể)
  useFocusEffect(useCallback(() => {
    if (!activeProfileId) return;
    loadAllergiesForProfile(activeProfileId).then(setAllergyRows).catch(() => setAllergyRows([]));
  }, [activeProfileId]));

  const goStack = (name) => navigation.getParent()?.navigate(name);

  // ── Hồ sơ ăn uống: đúng các thông tin onboarding thu thập ──────────────────
  const regionText = profile?.nation === 'other'
    ? t('onboarding.region.nations.other')
    : profile?.home_region
      ? t(`onboarding.region.regions.${profile.home_region}.label`)
      : t('profileScreen.notSet');
  const dietText = profile?.diet_type
    ? t(`onboarding.diet.diets.${profile.diet_type}.label`, {
        defaultValue: t('profileScreen.diet.' + profile.diet_type, { defaultValue: profile.diet_type }),
      })
    : t('profileScreen.notSet');
  const allergyList = allergyRows.map(r => (/^\d+$/.test(String(r.allergy_key))
    ? r.display_name
    : t(`onboarding.allergies.${r.allergy_key}`, { defaultValue: r.display_name || r.allergy_key })));
  const taste = tasteProfile || profile?.taste_weight || profile?.taste_profile;
  const tasteTop = taste ? tasteSummary(taste).slice(0, 4) : [];
  const tasteLabels = t('onboarding.tastes', { returnObjects: true });
  const genderText = profile?.gender === 'female' || profile?.gender === 'male'
    ? t(`onboarding.body.${profile.gender}`) : null;

  // Xóa profile Supabase + xóa luôn meal plan hôm nay của profile đó
  const handleDeleteProfile = (p) => {
    Alert.alert(
      t('profileScreen.deleteTitle', { name: p.displayName }),
      t('profileScreen.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.clearAll'), style: 'destructive',
          onPress: async () => {
            await deleteProfileMember(p.profileId);
            await removeMealPlanByProfileId(p.profileId);
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
  let bmi = null, bmiLabel = t('profileScreen.bmi.title'), bmiNote = '';
  if (latestMetrics?.height_cm && latestMetrics?.weight_kg) {
    const h = latestMetrics.height_cm / 100;
    const val = latestMetrics.weight_kg / (h * h);
    bmi = val.toFixed(1);
    if (val < 18.5) bmiNote = t('profileScreen.bmi.underweight');
    else if (val < 25) bmiNote = t('profileScreen.bmi.normal');
    else if (val < 30) bmiNote = t('profileScreen.bmi.overweight');
    else bmiNote = t('profileScreen.bmi.obese');
  }

  const personalSub = [genderText, regionText, dietText].filter(Boolean).join(' · ');
  const menuItems = [
    { icon: 'person-outline', iconName: 'profile-personal', iconBg: '#F0D9B8', iconColor: '#7A4E24', label: t('profileScreen.personalInfo'),
      sub: personalSub || t('profileScreen.notSet'),
      onPress: () => goStack('EditPersonal') },
    { icon: 'barbell-outline', iconName: 'profile-metrics', iconBg: '#DCE8C8', iconColor: '#3F5A2B', label: t('profileScreen.bodyMetrics'),
      sub: latestMetrics ? t('profileScreen.kgBmi', { weight: latestMetrics.weight_kg, bmi: bmi || '–' }) : t('profileScreen.notSet'),
      onPress: () => goStack('BodyMetrics') },
    { icon: 'warning-outline', iconName: 'profile-allergy-menu', iconBg: '#F5D9CC', iconColor: '#8A3B1F', label: t('profileScreen.allergies'),
      sub: t('profileScreen.allergiesSub'),
      onPress: () => goStack('Allergy') },
    { icon: 'flame-outline', iconName: 'profile-taste-menu', iconBg: '#F3D6D0', iconColor: '#8A2F2F', label: t('profileScreen.taste'),
      sub: t('profileScreen.tasteSub'),
      onPress: () => goStack('TasteProfile') },
  ];

  const heroName = profile?.displayName || profiles[0]?.displayName || t('profileScreen.yourProfile');

  return (
    <ScreenBackground texture="paper" edges={[]}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
        <SkyHeader variant="profile" style={[s.hero, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={[s.heroEdit, { top: insets.top + 8 }]}
            onPress={() => goStack('EditPersonal')}
            accessibilityRole="button"
            accessibilityLabel={t('profileScreen.editProfile')}
          >
            <Ionicons name="pencil-outline" size={20} color={P.muted} />
          </TouchableOpacity>

          <View style={s.avatarOuter}>
            <View style={s.avatarRing}>
              <ProfileAvatar profile={profile} size={96} animated />
            </View>
            <View style={s.avatarCheck}>
              <Ionicons name="checkmark" size={14} color={P.cream} />
            </View>
          </View>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={s.heroName} numberOfLines={1}>{heroName}</Text>
            <Text style={s.heroSub}>{t('profileScreen.heroSub')}</Text>
            {getProfileAge(profile, year) === null && (
              <TouchableOpacity onPress={() => goStack('EditPersonal')}>
                <Text style={s.heroSub}>{t('familyAvatar.missingYear')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.chipsRow}>
            {genderText && <Chip icon="person-outline" label={genderText} />}
            {profile?.diet_type && <Chip icon="restaurant-outline" label={dietText} />}
            {(profile?.home_region || profile?.nation === 'other') && <Chip icon="location-outline" label={regionText} />}
          </View>
        </SkyHeader>

        <View style={s.body}>
          {/* ══ CHỈ SỐ CƠ THỂ ═══════════════════════════════════════════════ */}
          <View style={[s.metrics, nativeShadow(P.brown, 0.25, 14, { width: 0, height: 8 }, 6)]}>
            <Metric label={t('profileScreen.weight')} value={latestMetrics?.weight_kg ?? '–'} unit="kg" />
            <View style={s.metricDivider} />
            <Metric label={t('profileScreen.height')} value={latestMetrics?.height_cm ?? '–'} unit="cm" />
            <View style={s.metricDivider} />
            <Metric label={bmiLabel} value={bmi ?? '–'} unit={bmiNote} />
          </View>

          {/* ══ 3 TAB: Ăn uống · Gia đình · Thiết lập ═══════════════════════ */}
          <View style={{ gap: 12 }}>
          <SegmentTabs
            value={tab}
            onChange={(nextTab) => {
              setTab(nextTab);
              setTabIconTrigger(value => value + 1);
            }}
            items={[
              { key: 'food',   label: t('profileScreen.tabFood'),   icon: (c) => <Ionicons name="restaurant-outline" size={15} color={c} /> },
              { key: 'family', label: t('profileScreen.tabFamily'), icon: (c) => <Ionicons name="people-outline" size={15} color={c} /> },
              { key: 'setup',  label: t('profileScreen.tabSetup'),  icon: (c) => <Ionicons name="options-outline" size={15} color={c} /> },
            ]}
          />

          <TabPanel id={tab}>
          {tab === 0 && (
          <View style={s.section}>
            <Text style={st.hint}>{t('profileScreen.foodHint')}</Text>
            <View style={[s.card, nativeShadow(), { paddingHorizontal: 16, paddingVertical: 4 }]}>
              <FoodRow icon="location-outline" iconName="profile-region" iconTrigger={`${screenIconTrigger}:${tabIconTrigger}`} iconDelay={0} iconBg="#F0D9B8" iconColor="#7A4E24" label={t('profileScreen.regionLabel')}>
                <Text style={fr.value}>{regionText}</Text>
              </FoodRow>
              <FoodRow icon="restaurant-outline" iconName="profile-diet" iconTrigger={`${screenIconTrigger}:${tabIconTrigger}`} iconDelay={70} iconBg="#DCE8C8" iconColor="#3F5A2B" label={t('profileScreen.dietLabel')}>
                <Text style={fr.value}>{dietText}</Text>
              </FoodRow>
              <FoodRow icon="warning-outline" iconName="profile-allergy-food" iconTrigger={`${screenIconTrigger}:${tabIconTrigger}`} iconDelay={140} iconBg="#F5D9CC" iconColor="#8A3B1F" label={t('profileScreen.allergyLabel')}>
                {allergyList.length > 0 ? (
                  <View style={fr.chips}>
                    {allergyList.map((a, i) => (
                      <View key={`${a}-${i}`} style={fr.allergyChip}>
                        <Text style={fr.allergyChipText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={fr.value}>{t('profileScreen.noAllergy')}</Text>
                )}
              </FoodRow>
              <FoodRow icon="flame-outline" iconName="profile-taste-food" iconTrigger={`${screenIconTrigger}:${tabIconTrigger}`} iconDelay={210} iconBg="#F3D6D0" iconColor="#8A2F2F" label={t('profileScreen.tasteLabel')} isLast>
                {tasteTop.length > 0 ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {tasteTop.map(x => (
                      <View key={x.key} style={fr.tasteRow}>
                        <Text style={fr.tasteName} numberOfLines={1}>{tasteLabels?.[x.key] || x.key}</Text>
                        <View style={fr.track}>
                          <View style={[fr.fill, { width: `${Math.max(4, Math.min(100, x.pct))}%`, backgroundColor: TASTE_COLOR[x.key] || P.accent }]} />
                        </View>
                        <Text style={fr.tastePct}>{x.pct}%</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={fr.value}>{t('profileScreen.notSet')}</Text>
                )}
              </FoodRow>
            </View>
          </View>

          )}

          {tab === 1 && (
          <View style={s.section}>
            <Text style={st.hint}>
              {t('profileScreen.familyHint')} · {t('familyAvatar.capacity', { count: profiles.length, max: MAX_FAMILY_MEMBERS })}
            </Text>
            <View style={[s.card, nativeShadow(), { padding: 6, gap: 2 }]}>
              {profiles.map((p, i) => (
                <MemberRow
                  key={p.profileId}
                  p={p}
                  tone={TONES[i % TONES.length]}
                  isActive={p.profileId === activeProfileId}
                  canDelete={profiles.length > 1}
                  onPress={() => p.profileId !== activeProfileId && switchProfile(p.profileId)}
                  onEdit={() => navigation.getParent()?.navigate('AddEditProfile', { profileId: p.profileId })}
                  onDelete={() => handleDeleteProfile(p)}
                />
              ))}

              <TouchableOpacity
                style={[s.addMember, atCapacity && { opacity: 0.5 }]}
                disabled={atCapacity}
                activeOpacity={0.75}
                onPress={() => navigation.getParent()?.navigate('AddEditProfile')}
              >
                <Ionicons name="add" size={18} color={P.accent} />
                <Text style={s.addMemberText}>{t('profileScreen.addMember')}</Text>
              </TouchableOpacity>
              {atCapacity && <Text style={s.heroSub}>{t('familyAvatar.limitBody')}</Text>}
            </View>
          </View>

          )}

          {tab === 2 && (
          <View style={s.section}>
            <View style={[s.card, nativeShadow(), { paddingHorizontal: 16 }]}>
              {menuItems.map((item, i) => (
                <MenuItem
                  key={item.label}
                  {...item}
                  iconTrigger={`${screenIconTrigger}:${tabIconTrigger}`}
                  iconDelay={i * 70}
                  isLast={i === menuItems.length - 1}
                />
              ))}
            </View>
          </View>
          )}
          </TabPanel>
          </View>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  body: { paddingHorizontal: 20, gap: 22 },

  // Hero
  hero: {
    alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 44,
    marginBottom: -20,
  },
  heroEdit: {
    position: 'absolute', right: 20, width: 44, height: 44, borderRadius: 14,
    borderWidth: 1, borderColor: P.border, backgroundColor: P.card,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  avatarOuter: { width: 104, height: 104 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52, backgroundColor: '#E9DDBF',
    borderWidth: 3, borderColor: '#8B5E3C',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Lora-Bold', fontSize: 44, color: P.brown },
  avatarCheck: {
    position: 'absolute', right: -2, bottom: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: P.brown, borderWidth: 3, borderColor: P.header,
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontFamily: 'Lora-Bold', fontSize: 26, lineHeight: 32, color: P.ink, textAlign: 'center' },
  heroSub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: P.muted },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },

  // Metrics
  metrics: {
    flexDirection: 'row', backgroundColor: P.brown, borderRadius: 22,
    paddingVertical: 18, paddingHorizontal: 6,
  },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,248,234,0.22)', marginVertical: 6 },

  // Section + card
  section: { gap: 10 },
  card: {
    backgroundColor: 'rgba(255,250,240,0.95)', borderRadius: 22,
    borderWidth: 1, borderColor: P.border,
  },

  // Add member
  addMember: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 48, margin: 4, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.dashed,
  },
  addMemberText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 14, color: P.accent },
});

// ── Chip styles ───────────────────────────────────────────────────────────────
const ch = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: P.border, backgroundColor: P.card,
  },
  text: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12.5, color: P.brown },
});

// ── Section title styles ──────────────────────────────────────────────────────
const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: 'Lora-Bold', fontSize: 19, color: P.ink },
  hint: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: P.muted, flexShrink: 1 },
});

// ── Metric styles ─────────────────────────────────────────────────────────────
const mt = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  label: { fontFamily: 'BeVietnamPro-Bold', fontSize: 11, letterSpacing: 0.8, color: P.gold },
  value: { fontFamily: 'Lora-Bold', fontSize: 28, lineHeight: 33, color: '#FFF9EB' },
  unit: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: P.gold },
});

// ── FoodRow styles ────────────────────────────────────────────────────────────
const fr = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: P.divider },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 12.5, color: P.muted },
  value: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 15, lineHeight: 21, color: P.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChip: { backgroundColor: '#F8E1D6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  allergyChipText: { fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13, color: '#8A3B1F' },
  tasteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tasteName: { width: 64, fontFamily: 'BeVietnamPro-SemiBold', fontSize: 13, color: P.ink },
  track: { flex: 1, height: 8, borderRadius: 999, backgroundColor: P.divider, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  tastePct: { width: 36, textAlign: 'right', fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: P.muted },
});

// ── MemberRow styles ──────────────────────────────────────────────────────────
const mr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingLeft: 10, paddingRight: 4, minHeight: 64,
    borderRadius: 18, borderWidth: 1.5, borderColor: 'transparent',
  },
  rowActive: { backgroundColor: '#F3E8CE', borderColor: '#8B5E3C' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Lora-Bold', fontSize: 18 },
  name: { fontFamily: 'Lora-Bold', fontSize: 16, color: P.ink },
  sub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: P.muted, marginTop: 2 },
  activePill: { backgroundColor: P.brown, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  activePillText: { fontFamily: 'BeVietnamPro-Bold', fontSize: 11.5, color: P.cream },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

// ── MenuItem styles ───────────────────────────────────────────────────────────
const mi = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: P.divider },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, gap: 1 },
  label: { fontFamily: 'Lora-Bold', fontSize: 16, color: P.ink },
  sub: { fontFamily: 'BeVietnamPro-Regular', fontSize: 12.5, color: P.muted },
});

export default ProfileScreen;
