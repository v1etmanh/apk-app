import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Dimensions, ImageBackground, Switch, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
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
import { Bell }           from 'phosphor-react-native/lib/module/icons/Bell';
import { Clock }          from 'phosphor-react-native/lib/module/icons/Clock';
import { getSetting, setSetting, clearAllHistory } from '../utils/database';
import {
  requestNotificationPermission,
  setupNotificationChannel,
  rescheduleAllReminders,
  cancelAllReminders,
  loadReminderSettings,
  saveReminderSettings,
  DEFAULT_REMINDER_TIMES,
} from '../services/mealReminderService';
import { useAppStore } from '../store/useAppStore';
import { supabase }    from '../store/supabase';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage as changeAppLanguage } from '../i18n';
import { C }           from '../theme';
import ScreenBackground from '../components/ui/ScreenBackground';
import PaperCard        from '../components/ui/PaperCard';
import SectionHeader    from '../components/ui/SectionHeader';
import AnimatedAppIcon from '../components/ui/AnimatedAppIcon';
import { WeatherImageBackground } from '../components/ui/WeatherSkyBackground';

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
const SettingsRow = ({ IconComponent, lottieName, iconTrigger, iconDelay = 0, iconBg, label, control, danger, isLast, onPress }) => {
  const inner = (
    <>
      <View style={[st.settingsIconBox, { backgroundColor: danger ? 'rgba(231,76,60,0.2)' : iconBg }]}>
        <AnimatedAppIcon
          name={lottieName}
          size={34}
          trigger={iconTrigger}
          playOnVisible
          delay={iconDelay}
          fallback={<PhosphorIcon IconComponent={IconComponent} danger={danger} />}
        />
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
const ActionRow = ({ IconComponent, lottieName, iconTrigger, iconDelay, iconBg, label, actionLabel, onPress, danger, isLast }) => (
  <SettingsRow
    IconComponent={IconComponent}
    lottieName={lottieName}
    iconTrigger={iconTrigger}
    iconDelay={iconDelay}
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

// ─── TimePickerRow ────────────────────────────────────────────────────────────
const HOURS   = Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2,'0')}h`, value: String(i) }));
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => ({
  label: `:${String(m).padStart(2,'0')}`,
  value: String(m),
}));

const TimePickerRow = ({ meal, onChange, isLast, label }) => (
  <View style={[st.settingsRow, { paddingVertical: 10 }]}>
    <View style={[st.settingsIconBox, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
      <Clock weight="duotone" size={20} color={C.accentGold ?? '#C97A1A'} />
    </View>
    <Text style={st.settingsRowLabel}>{label || meal.label}</Text>
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <WoodPicker
        selectedValue={String(meal.hour)}
        onValueChange={(v) => onChange({ ...meal, hour: Number(v) })}
        items={HOURS}
      />
      <WoodPicker
        selectedValue={String(meal.minute)}
        onValueChange={(v) => onChange({ ...meal, minute: Number(v) })}
        items={MINUTES}
      />
    </View>
  </View>
);

// ─── SettingsScreen ──────────────────────────────────────────────────────────
const SettingsScreen = () => {
  const { t } = useTranslation();
  const [maxCookTime,       setMaxCookTime]          = useState('60');
  const [costPreference,    setCostPreferenceLocal]  = useState('2');
  const [language,          setLanguage]             = useState(
    i18n.language === 'en' ? 'en' : 'vi'
  );
  const [unitSystem,        setUnitSystem]           = useState('metric');
  const [reminderEnabled,   setReminderEnabled]      = useState(false);
  const [reminderTimes,     setReminderTimes]        = useState(DEFAULT_REMINDER_TIMES);
  const [screenIconTrigger, setScreenIconTrigger]    = useState(0);
  const [rowIconTriggers, setRowIconTriggers] = useState({
    reminder: 0, budget: 0, timer: 0, language: 0, logout: 0,
  });

  const { location, setLocation, setCostPreference: setStoreCostPref } = useAppStore();
  const insets = useSafeAreaInsets();

  const pulseIcon = useCallback((name) => {
    setRowIconTriggers(current => ({ ...current, [name]: current[name] + 1 }));
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  useFocusEffect(useCallback(() => {
    setScreenIconTrigger(value => value + 1);
  }, []));

  // [FIX NOTIF-SYNC] Đồng bộ switch với system permission mỗi khi màn hình được focus.
  // User có thể vào System Settings tắt notification ngoài app → switch phải phản ánh đúng.
  useFocusEffect(useCallback(() => {
    // Delay nhỏ để OS kịp cập nhật permission status sau khi dialog đóng
    const timer = setTimeout(async () => {
      const { status } = await Notifications.getPermissionsAsync();
      const systemGranted = status === 'granted';
      setReminderEnabled(prev => {
        if (!systemGranted && prev) {
          cancelAllReminders();
          loadReminderSettings().then(({ times }) => saveReminderSettings(false, times));
          return false;
        }
        return prev;
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []));

  const loadSettings = async () => {
    try {
      const [cook, cost, lang, unit, lat, lon, province] = await Promise.all([
        getSetting('max_cook_time'),
        getSetting('cost_preference'), getSetting('language'),
        getSetting('unit_system'),     getSetting('last_known_lat'),
        getSetting('last_known_lon'),  getSetting('last_known_province'),
      ]);
      setMaxCookTime(cook           || '60');
      setCostPreferenceLocal(cost   || '2');
      setLanguage(lang === 'en' || lang === 'vi'
        ? lang
        : (i18n.language === 'en' ? 'en' : 'vi'));
      setUnitSystem(unit            || 'metric');
      if (lat && lon) setLocation({
        ...location,
        lat:      parseFloat(lat),
        lon:      parseFloat(lon),
        province: province || location?.province,
      });
      // Load trạng thái reminder — KHÔNG tự tắt ở đây
      // Việc sync với system permission đã có useFocusEffect lo (với delay 500ms)
      // Tự tắt trong loadSettings gây bug: Android chưa update permission kịp → tắt nhầm
      const { enabled, times } = await loadReminderSettings();
      setReminderEnabled(enabled);
      setReminderTimes(times || DEFAULT_REMINDER_TIMES);
    } catch (e) { console.error('loadSettings:', e); }
  };

  const handleReminderToggle = async (value) => {
    pulseIcon('reminder');
    try {
      if (value) {
        // Kiểm tra permission hiện tại trước
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          // Thử request (chỉ hiện dialog nếu chưa từng hỏi)
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            // Đã từng deny → dialog không hiện nữa → mở System Settings
            Alert.alert(
              t('settings.reminderPermissionTitle'),
              t('settings.reminderPermissionBody'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('settings.openSettings'), onPress: () => Linking.openSettings() },
              ],
            );
            return; // switch không bật
          }
        }
        await setupNotificationChannel();
        await rescheduleAllReminders(reminderTimes);
        await saveReminderSettings(true, reminderTimes);
        setReminderEnabled(true);
        const lunch  = reminderTimes.find(t => t.id === 'lunch');
        const dinner = reminderTimes.find(t => t.id === 'dinner');
        Alert.alert(
          t('settings.reminderEnabled'),
          t('settings.reminderBody', {
            lunch: `${String(lunch.hour).padStart(2,'0')}:${String(lunch.minute).padStart(2,'0')}`,
            dinner: `${String(dinner.hour).padStart(2,'0')}:${String(dinner.minute).padStart(2,'0')}`,
          }),
        );
      } else {
        await cancelAllReminders();
        await saveReminderSettings(false, reminderTimes);
        setReminderEnabled(false);
      }
    } catch (e) {
      console.error('handleReminderToggle:', e);
      Alert.alert(t('common.error'), t('settings.notificationError'));
    }
  };

  const updateReminderTime = async (mealId, newMeal) => {
    const newTimes = reminderTimes.map(t => t.id === mealId ? newMeal : t);
    setReminderTimes(newTimes);
    try {
      if (reminderEnabled) {
        await rescheduleAllReminders(newTimes);
      }
      await saveReminderSettings(reminderEnabled, newTimes);
    } catch (e) {
      console.error('updateReminderTime:', e);
    }
  };

  const save = async (key, val) => {
    try { await setSetting(key, String(val)); }
    catch { Alert.alert(t('common.error'), t('settings.notificationError')); }
  };

  const handleCookTimeChange = async v => {
    pulseIcon('timer');
    setMaxCookTime(v);
    await save('max_cook_time', v);
  };
  const handleLanguageChange = async v => {
    pulseIcon('language');
    setLanguage(v);
    await save('language', v);
    await changeAppLanguage(v);
    await useAppStore.getState().initializeIngredients(v);
    if (reminderEnabled) {
      await rescheduleAllReminders(reminderTimes);
    }
  };
  const handleUnitChange     = async v => { setUnitSystem(v);          await save('unit_system',     v); };
  const handleCostChange     = async v => {
    pulseIcon('budget');
    setCostPreferenceLocal(v);
    setStoreCostPref(Number(v));
    await save('cost_preference', v);
  };

  const clearHistory = () => {
    Alert.alert(t('settings.clearHistory'), t('settings.clearHistoryBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.clearAll'), style: 'destructive', onPress: async () => {
          try {
            await clearAllHistory();
            Alert.alert(t('common.done'), t('settings.historyCleared'));
          } catch {
            Alert.alert(t('common.error'), t('settings.clearHistoryError'));
          }
        },
      },
    ]);
  };

  const syncIngredients = () => {
    Alert.alert(t('settings.sync'), t('settings.syncStarted'));
    setTimeout(() => Alert.alert(t('common.done'), t('settings.syncDone')), 1000);
  };

  const exportData = () => Alert.alert(t('settings.export'), t('settings.exportSoon'));

  const handleLogout = () => {
    pulseIcon('logout');
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logoutConfirmAction'),
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            // App.js lắng nghe onAuthStateChange → tự chuyển về LoginScreen
          },
        },
      ]
    );
  };

  return (
    <ScreenBackground texture="paper" edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
      >
        {/* ── Header ── */}
        <WeatherImageBackground
          style={[st.header, { paddingTop: insets.top + 12 }]}
          imageOpacity={0.45}
        >
          {/* Mèo Cattr phía trên bánh răng */}
          <LottieView
            source={CATTR}
            autoPlay
            loop
            style={[st.cattrLottie, { pointerEvents: 'none' }]}
          />

          {/* Bánh răng vẽ tay — phát một lượt khi màn hình được focus */}
          <AnimatedAppIcon
            name="settings-gear"
            size={58}
            trigger={screenIconTrigger}
            playOnVisible
            fallback={<GearSix weight="duotone" size={44} color={C.textMid} />}
            style={{ marginBottom: 6 }}
          />

          <Text style={st.headerTitle}>{t('settings.title')}</Text>
          <Text style={st.headerSub}>{t('settings.subtitle')}</Text>
          <Svg width={SW} height={22} style={st.headerWave}>
            <Path
              d={`M0,8 Q${SW * .13},20 ${SW * .27},9 Q${SW * .41},0 ${SW * .55},11 Q${SW * .69},20 ${SW * .83},8 Q${SW * .92},2 ${SW},9 L${SW},22 L0,22 Z`}
              fill={C.bg}
            />
          </Svg>
        </WeatherImageBackground>

        {/* ── Section: Thông báo ── */}
        <SectionHeader title={t('settings.notifications')} />
        <PaperCard containerStyle={st.cardWrapper}>
          <SettingsRow
            IconComponent={Bell}
            lottieName="settings-reminder"
            iconTrigger={`${screenIconTrigger}:${rowIconTriggers.reminder}`}
            iconDelay={0}
            iconBg="rgba(251,191,36,0.2)"
            label={t('settings.mealReminder')}
            isLast={true}
            control={
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: '#D1D5DB', true: '#60A5FA' }}
                thumbColor={reminderEnabled ? '#3B82F6' : '#F3F4F6'}
              />
            }
          />

        </PaperCard>

        <SectionHeader title={t('settings.defaults')} />
        <PaperCard containerStyle={st.cardWrapper}>
          <SettingsRow
            IconComponent={CurrencyDollar}
            lottieName="settings-budget"
            iconTrigger={`${screenIconTrigger}:${rowIconTriggers.budget}`}
            iconDelay={70}
            iconBg="rgba(56,176,122,0.2)"
            label={t('settings.cost')}
            control={
              <WoodPicker
                selectedValue={costPreference}
                onValueChange={handleCostChange}
                items={[
                  { label: t('settings.budget'), value: '1' },
                  { label: t('settings.moderate'),  value: '2' },
                  { label: t('settings.comfortable'), value: '3' },
                ]}
              />
            }
          />
          <SettingsRow
            IconComponent={Timer}
            lottieName="settings-timer"
            iconTrigger={`${screenIconTrigger}:${rowIconTriggers.timer}`}
            iconDelay={140}
            iconBg="rgba(52,152,219,0.2)"
            label={t('settings.maxCookTime')}
            control={
              <WoodPicker
                selectedValue={maxCookTime}
                onValueChange={handleCookTimeChange}
                items={['15', '30', '45', '60', '75', '90', '115'].map(v => ({ label: t('common.minutes', { count: v }), value: v }))}
              />
            }
          />
          <SettingsRow
            IconComponent={Globe}
            lottieName="settings-language"
            iconTrigger={`${screenIconTrigger}:${rowIconTriggers.language}`}
            iconDelay={210}
            iconBg="rgba(96,165,250,0.18)"
            label={t('language.label')}
            control={
              <WoodPicker
                selectedValue={language}
                onValueChange={handleLanguageChange}
                placeholder={t('language.label')}
                items={[
                  { label: t('language.vietnamese'), value: 'vi', flagCode: 'VN' },
                  { label: t('language.english'), value: 'en', flagCode: 'GLOBAL' },
                ]}
              />
            }
            isLast
          />
        </PaperCard>


        {/* ── Section: Tài khoản ── */}
        <SectionHeader title={t('settings.account')} />
        <PaperCard containerStyle={st.cardWrapper}>
          <ActionRow
            IconComponent={SignOut}
            lottieName="settings-logout"
            iconTrigger={`${screenIconTrigger}:${rowIconTriggers.logout}`}
            iconDelay={280}
            iconBg="rgba(231,76,60,0.2)"
            label={t('settings.logout')}
            actionLabel={t('settings.logoutAction')}
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
          <Text style={st.versionText}>{t('settings.version')}</Text>
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

  // ── Dev Tools ──
  devBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
  },
  devBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#3B82F6',
  },

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
