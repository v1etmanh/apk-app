/**
 * App.js — Auth-protected navigation
 * Luồng: loading → unauthenticated (Login) | authenticated → Onboarding (user mới) | Main
 */

// PHẢI đứng đầu: vá InteractionManager (RN 0.88 đã gỡ) cho @react-navigation/stack 6.x
import './utils/interactionManagerShim';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StatusBar, View, Text, StyleSheet, Image, AppState, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { supabase } from './store/supabase';
import { setSetting, getSetting, loadStartupProfiles, getDeviceId } from './utils/database';
import { useAppStore } from './store/useAppStore';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { setupNotificationChannel } from './services/mealReminderService';
import { api } from './services/api';
import LoginScreen             from './screens/LoginScreen';
import HomeScreen              from './screens/HomeScreen';
import HistoryScreen           from './screens/HistoryScreen';
import ProfileScreen           from './screens/ProfileScreen';
import SettingsScreen          from './screens/SettingsScreen';
import DishDetailScreen        from './screens/DishDetailScreen';
import CookingStepsScreen      from './screens/CookingStepsScreen';
import MarketBasketScreen      from './screens/MarketBasketScreen';
import HistoryDetailScreen     from './screens/HistoryDetailScreen';
import EditPersonalScreen      from './screens/EditPersonalScreen';
import BodyMetricsScreen       from './screens/BodyMetricsScreen';
import AllergyScreen           from './screens/AllergyScreen';
import TasteProfileScreen      from './screens/TasteProfileScreen';
import OnboardingFlow          from './screens/onboarding/OnboardingFlow';
import TasteOnboardingScreen  from './screens/onboarding/TasteOnboardingScreen';
import ProfileOnboardingScreen from './screens/onboarding/ProfileOnboardingScreen';
import { needsOnboarding }    from './services/onboardingService';
import RecommendScreen         from './screens/RecommendScreen';
import IngredientSuggestScreen from './screens/IngredientSuggestScreen';
import ResetPasswordScreen     from './screens/ResetPasswordScreen';
import AddEditProfileScreen    from './screens/AddEditProfileScreen';
import ChosenDishScreen        from './screens/ChosenDishScreen';
import MealReminderModal       from './components/MealReminderModal';
import BubbleTabButton         from './components/ui/BubbleTabButton';
import i18n, { restoreLanguage, changeLanguage } from './i18n';
import { useTranslation } from 'react-i18next';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Notification handler — PHẢI đặt ở top-level, ngoài component ────────────
// Không có dòng này → notification KHÔNG hiển thị khi app đang foreground
// Và trên một số APK builds → notification bị drop hoàn toàn
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// ── Static assets ─────────────────────────────────────────────────────────
const TEX = {
  wood:  require('./assets/textures/wood_light.png'),
  paper: require('./assets/textures/paper_cream.png'),
};
const LAZY_CAT = require('./assets/animations/Cute cat works.json');

// ── Tab icon helper ───────────────────────────────────────────────────────
const TabIcon = ({ emoji, focused }) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

// ── Main Tabs ─────────────────────────────────────────────────────────────
const MainTabs = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor:   '#60A5FA',
      tabBarInactiveTintColor: '#8B7355',
      tabBarStyle: { backgroundColor: '#F5EDDC', borderTopColor: '#C8A96E', borderTopWidth: 1.5 },
      tabBarButton: props => <BubbleTabButton {...props} />,
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home"      component={HomeScreen}
      options={{ tabBarLabel: t('tabs.home'), tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused}/> }}/>
   
    <Tab.Screen name="ChosenDish" component={ChosenDishScreen}
      options={{ tabBarLabel: t('tabs.today'), tabBarIcon: ({ focused }) => <TabIcon emoji="🍱" focused={focused}/> }}/>
    <Tab.Screen name="History"   component={HistoryScreen}
      options={{ tabBarLabel: t('tabs.history'),   tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused}/> }}/>
    <Tab.Screen name="Profile"   component={ProfileScreen}
      options={{ tabBarLabel: t('tabs.profile'),     tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused}/> }}/>
    <Tab.Screen name="Settings"  component={SettingsScreen}
      options={{ tabBarLabel: t('tabs.settings'),   tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused}/> }}/>
  </Tab.Navigator>
  );
};

// ── Splash Screen (Lottie Lazy Cat) ──────────────────────────────────────
const SplashScreen = ({ onRetry, fontsReady = true }) => {
  const { t } = useTranslation();
  return (
  <View style={sp.root}>
    {/* Layer 1 — wood background */}
    <Image
      source={TEX.wood}
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.82 }]}
      resizeMode="cover"
    />
    {/* Layer 2 — cream overlay */}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(240,230,210,0.45)' }]} />

    {/* ParchmentCard chứa mascot */}
    <View style={sp.cardShadow}>
      <View style={sp.card}>
        {/* Paper texture — wrapper riêng, KHÔNG overflow trên card */}
        <View style={[StyleSheet.absoluteFill, { borderRadius: 24, overflow: 'hidden' }]}
              pointerEvents="none">
          <Image source={TEX.paper} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>

        <View style={{ zIndex: 1, alignItems: 'center' }}>
          {/* Lazy Cat Lottie */}
          <LottieView
            source={LAZY_CAT}
            autoPlay
            loop
            style={[sp.lottie, { pointerEvents: 'none' }]}
          />
          {/* key đổi khi font load xong → remount Text để Android đo lại width,
              tránh bị cắt chữ ("Daily Ma") do đo bằng font hệ thống trước đó */}
          <Text
            key={fontsReady ? 'title-font' : 'title-fallback'}
            style={[sp.title, !fontsReady && { fontFamily: undefined, fontWeight: '700' }]}
          >
            Daily Mate
          </Text>
          <Text
            key={fontsReady ? 'sub-font' : 'sub-fallback'}
            style={[sp.sub, !fontsReady && { fontFamily: undefined }]}
          >{t(onRetry ? 'splash.profileError' : 'splash.preparing')}</Text>

          {/* Loading dots */}
          {onRetry ? <Button title={t('common.retry')} onPress={onRetry} /> : <View style={sp.dotsRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[sp.dot, { opacity: 0.35 + i * 0.2 }]} />
            ))}
          </View>}
        </View>
      </View>
    </View>

    {/* Footer */}
    <Text
      key={fontsReady ? 'footer-font' : 'footer-fallback'}
      style={[sp.footer, !fontsReady && { fontFamily: undefined }]}
    >
      {t('splash.companion')}
    </Text>
  </View>
  );
};

// ── Splash styles (design.md compliant) ──────────────────────────────────
const sp = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5E3C',   // Wood Dark fallback
  },
  cardShadow: {
    borderRadius: 24,
    shadowColor: '#8B5E3C',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginHorizontal: 32,
  },
  card: {
    borderRadius: 24,
    backgroundColor: '#F5EDDC',   // Parchment
    padding: 28,
    borderWidth: 1.5,
    borderColor: '#C8A96E',       // Wood Mid
    alignItems: 'center',
    // KHÔNG overflow:hidden — giữ shadow
  },
  lottie: {
    width: 180,
    height: 180,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Lora-Bold',
    fontSize: 26,
    color: '#3D2B1F',             // Ink Brown
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 4,         // chừa chỗ cho glyph Lora-Bold, tránh cắt mép chữ
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 15,
    color: '#8B7355',             // Ink Muted
    lineHeight: 23,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A96E',   // Wood Mid
  },
  footer: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: 'rgba(245,237,220,0.7)',
    textAlign: 'center',
    marginTop: 28,
  },
});

// ── Root App ──────────────────────────────────────────────────────────────
const App = () => {
  const { initializeIngredients, initializeSettings } = useAppStore();

  // navigationRef — dùng để navigate từ notification listener (ngoài navigator context)
  const navigationRef = useRef(null);
  // appStateRef — track AppState để detect foreground
  const appStateRef   = useRef(AppState.currentState);


  // undefined until Supabase emits INITIAL_SESSION, null while signed out.
  const [account, setAccount] = useState(undefined);
  const currentAccount = useRef(undefined);
  const pendingInit = useRef(Promise.resolve());
  const appReadyRef = useRef(false);
  const [route, setRoute] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [languageReady,  setLanguageReady] = useState(false);
  const [showReset,      setShowReset]      = useState(false);

  const [fontsLoaded] = useFonts({
    // Be Vietnam Pro — body text
    'BeVietnamPro-Regular':    BeVietnamPro_400Regular,
    'BeVietnamPro-SemiBold':   BeVietnamPro_600SemiBold,
    'BeVietnamPro-Bold':       BeVietnamPro_700Bold,
    // Lora — display / titles
    'Lora-SemiBold':           Lora_600SemiBold,
    'Lora-Bold':               Lora_700Bold,
    // Legacy aliases (các screen cũ chưa migrate)
    'Nunito':                  BeVietnamPro_400Regular,
    'Nunito-Regular':          BeVietnamPro_400Regular,
    'Nunito-Bold':             BeVietnamPro_700Bold,
    'Patrick Hand':            Lora_700Bold,
    'PatrickHand-Regular':     Lora_700Bold,
  });

  useEffect(() => {
    restoreLanguage()
      .catch(error => console.warn('[i18n] Could not restore language:', error?.message))
      .finally(() => setLanguageReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const previous = currentAccount.current;
      const userId = session?.user?.id ?? null;
      if (previous !== undefined && (previous?.id ?? null) === userId) return;
      const next = userId ? { id: userId } : null;
      currentAccount.current = next;
      appReadyRef.current = false;
      setRoute('loading');
      setAccount(next);
      if (previous) {
        setShowReset(false);
        pendingInit.current = pendingInit.current.then(() => useAppStore.getState().resetStore(previous.id));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Deep link handler: email confirm / reset password
  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;
      // [AUD-007] Whitelist schemes — reject URL lạ, tránh deep link hijacking
      if (!url.startsWith('dailymate://') && !url.startsWith('exp://')) {
        if (__DEV__) console.warn('[DeepLink] Rejected unknown scheme:', url.slice(0, 40));
        return;
      }

      // PKCE flow (Google OAuth APK): ?code=XXX
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code || null;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) console.error('exchangeCodeForSession error:', error.message);
        return;
      }

      // Implicit flow: email confirm / reset password → #access_token=...
      let accessToken  = null;
      let refreshToken = null;
      const hashPart = url.split('#')[1];
      if (hashPart) {
        const params = Object.fromEntries(new URLSearchParams(hashPart));
        accessToken  = params.access_token  || null;
        refreshToken = params.refresh_token || null;
      }
      if (!accessToken) {
        accessToken  = parsed.queryParams?.access_token  || null;
        refreshToken = parsed.queryParams?.refresh_token || null;
      }
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        // Nếu URL là reset-password → hiện màn hình đổi mật khẩu
        if (url.includes('reset-password')) setShowReset(true);
      }
    };

    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  // ── Notification listeners — đăng ký 1 lần khi app mount ─────────────────
  useEffect(() => {
    // Khi user TAP vào notification → navigate đến màn hình liên quan
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'MealReminder') {
        // Điều hướng thẳng đến Recommend thay vì mở modal
        navigationRef.current?.navigate('Recommend');
      }
    });
    // KHÔNG đăng ký addNotificationReceivedListener → notification foreground
    // sẽ hiển thị ở thanh thông báo hệ thống (nhờ setNotificationHandler ở top-level)
    // thay vì mở modal trong app
    return () => {
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    const isCurrent = () => !cancelled && currentAccount.current === account;
    pendingInit.current = pendingInit.current.then(async () => {
      if (isCurrent()) await initializeApp(isCurrent);
    }).catch(error => {
      if (isCurrent()) {
        console.error('[App] initializeApp:', error);
        setRoute('error');
      }
    });
    return () => { cancelled = true; };
  }, [account, attempt]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = Math.round(loc.coords.latitude  * 100) / 100;
      const lon = Math.round(loc.coords.longitude * 100) / 100;
      setSetting('last_known_lat', String(lat));
      setSetting('last_known_lon', String(lon));
      if (__DEV__) console.warn('User location (rounded):', { lat, lon });
      return loc;
    } catch { return null; }
  };

  // [FIX LOC-002] Chỉ dùng khi resume từ background — KHÔNG request permission
  // (requestForegroundPermissionsAsync hiển thị dialog → app vào background →
  //  AppState fire → gọi lại hàm này → vòng lặp vô hạn)
  const getLocationWithoutRequest = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = Math.round(loc.coords.latitude  * 100) / 100;
      const lon = Math.round(loc.coords.longitude * 100) / 100;
      setSetting('last_known_lat', String(lat));
      setSetting('last_known_lon', String(lon));
      return loc;
    } catch { return null; }
  };

  // ── Fetch location mỗi lần app mở / resume từ background ────────────────
  const checkLocationOnResume = useCallback(async () => {
    if (!account || !appReadyRef.current) return;
    if (__DEV__) console.log('[Location] App resume — re-fetch location');
    // [FIX LOC-002] dùng getLocationWithoutRequest — không hiển thị permission dialog
    const loc = await getLocationWithoutRequest();
    if (loc) {
      const lat = Math.round(loc.coords.latitude  * 100) / 100;
      const lon = Math.round(loc.coords.longitude * 100) / 100;
      const current = useAppStore.getState().location;
      // [FIX LOC-001] Chỉ setLocation nếu toạ độ thực sự thay đổi (>= 0.01 độ ~ 1km)
      // Tránh trigger re-render HomeScreen khi user không di chuyển
      if (Math.abs((current?.lat ?? 0) - lat) >= 0.01 || Math.abs((current?.lon ?? 0) - lon) >= 0.01) {
        useAppStore.getState().setLocation({
          lat,
          lon,
          province:    current?.province    ?? '',
          food_region: current?.food_region ?? '',
        });
      }
      registerDeviceToken(loc);
    }
  }, [account]);

  // ── Lắng nghe AppState — chạy checkLocationOnResume khi về foreground ─────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current !== 'active' && nextState === 'active') {
        // App vừa được mở / resume từ background
        checkLocationOnResume();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [checkLocationOnResume]);


  const registerDeviceToken = async (location) => {
    try {
      // Request notification permission — hiện dialog nếu chưa granted
      // Dùng lại !== 'granted' thay vì === 'undetermined' vì Android
      // đôi khi trả về giá trị khác sau cài APK mới
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        if (__DEV__) console.warn('[Push] Notification permission not granted:', finalStatus);
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'b0b88ff3-6754-479f-bfbc-68a309e75da5',
      });
      const expoPushToken = tokenData.data; // "ExponentPushToken[xxx]"

      const deviceId = await getDeviceId();
      // [AUD-006] Round tọa độ trước khi gửi lên server
      const lat = location?.coords?.latitude  != null ? Math.round(location.coords.latitude  * 100) / 100 : null;
      const lon = location?.coords?.longitude != null ? Math.round(location.coords.longitude * 100) / 100 : null;

      await api.post('/api/v1/device/register', {
        device_id: deviceId,
        fcm_token:  expoPushToken,
        lat,
        lon,
      });

      if (__DEV__) console.log('[Push] Device registered:', expoPushToken.slice(0, 30));
    } catch (e) {
      // Non-critical — không crash app nếu đăng ký thất bại
      if (__DEV__) console.warn('[Push] registerDeviceToken failed:', e.message);
    }
  };

  // [FIX PERM] GPS trước, notification sau (tránh 2 dialog chồng nhau)
  const requestDevicePermissions = async () => {
    const locResult = await getUserLocation();
    if (currentAccount.current !== account) return;
    if (locResult) {
      useAppStore.getState().setLocation({
        lat: Math.round(locResult.coords.latitude  * 100) / 100,
        lon: Math.round(locResult.coords.longitude * 100) / 100,
        province:    useAppStore.getState().location?.province    ?? '',
        food_region: useAppStore.getState().location?.food_region ?? '',
      });
    }
    // Notification permission + đăng ký token (chạy sau GPS để dialog không chồng)
    registerDeviceToken(locResult);
  };

  const handleOnboardingFinish = async () => {
    if (currentAccount.current !== account) return;
    setRoute('main');
    appReadyRef.current = true;
    await requestDevicePermissions();
  };

  // Keep the persisted device setting and i18n preference in sync.
  // First login: use the language already selected by i18n (device locale
  // when supported, otherwise vi) and persist it for future launches.
  const syncLanguage = async (isCurrent) => {
    const savedLanguage = await getSetting('language');
    if (!isCurrent()) return;
    const language = savedLanguage === 'vi' || savedLanguage === 'en'
      ? savedLanguage
      : (i18n.language === 'en' ? 'en' : 'vi');
    await changeLanguage(language);
    if (isCurrent() && savedLanguage !== language) {
      await setSetting('language', language);
    }
  };

  const initializeApp = async (isCurrent) => {
    const store = useAppStore.getState();

    // Các bước độc lập chạy song song thay vì nối tiếp.
    // Profile phải hydrate SAU initializeSettings vì hàm đó cũng ghi activeProfileId.
    const profileTask = Promise.all([loadStartupProfiles(), initializeSettings()])
      .then(async ([startup]) => {
        if (isCurrent()) await store.hydrateStartupProfile(startup);
        return startup.profile;
      });

    const [profile] = await Promise.all([
      profileTask,
      syncLanguage(isCurrent),
      store.loadSavedDishes(),
      setupNotificationChannel().catch(error => console.warn('[Push] Notification channel:', error.message)),
    ]);

    if (!isCurrent()) return;
    const mustOnboard = needsOnboarding(profile);
    setRoute(mustOnboard ? 'onboarding' : 'main');
    appReadyRef.current = !mustOnboard;

    // Nguyên liệu không chặn splash: có bản lưu thì dùng ngay, API làm mới chạy ngầm.
    // Các màn cần nguyên liệu tự gọi lại nếu danh sách còn rỗng.
    initializeIngredients();

    if (!mustOnboard) requestDevicePermissions().catch(error => console.warn('[Permissions]', error.message));
  };

  // Fonts chưa load hoặc đang khởi tạo → Splash với Lazy Cat
  if (!fontsLoaded || !languageReady || account === undefined || (account && route === 'loading')) {
    return <SplashScreen fontsReady={fontsLoaded} />;
  }

  // Chưa đăng nhập → LoginScreen
  if (!account) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#8B5E3C" />
        <LoginScreen />
      </>
    );
  }

  // Đã đăng nhập nhưng đang trong flow reset password
  if (showReset) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#8B5E3C" />
        <ResetPasswordScreen onDone={() => setShowReset(false)} />
      </>
    );
  }

  if (route === 'error') {
    return <SplashScreen onRetry={() => { setRoute('loading'); setAttempt(n => n + 1); }} />;
  }

  if (route === 'onboarding') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5EDDC' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5EDDC" />
        <NavigationContainer>
          <OnboardingFlow mode="full" onFinish={handleOnboardingFinish} />
        </NavigationContainer>
      </SafeAreaView>
    );
  }

  // Đã đăng nhập → toàn bộ app
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EDDC" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main"             component={MainTabs}/>
          <Stack.Screen name="DishDetail"       component={DishDetailScreen}/>
          <Stack.Screen name="CookingSteps"     component={CookingStepsScreen}/>
          <Stack.Screen name="MarketBasket"     component={MarketBasketScreen}/>
          <Stack.Screen name="HistoryDetail"    component={HistoryDetailScreen}/>
          <Stack.Screen name="EditPersonal"     component={EditPersonalScreen}/>
          <Stack.Screen name="BodyMetrics"      component={BodyMetricsScreen}/>
          <Stack.Screen name="Allergy"          component={AllergyScreen}/>
          <Stack.Screen name="TasteProfile"     component={TasteProfileScreen}/>
          <Stack.Screen name="Recommend"        component={RecommendScreen}/>
          <Stack.Screen name="IngredientSuggest" component={IngredientSuggestScreen}/>
          <Stack.Screen name="AddEditProfile"   component={AddEditProfileScreen}/>
          <Stack.Screen name="TasteOnboarding"  component={TasteOnboardingScreen}/>
          <Stack.Screen name="ProfileOnboarding" component={ProfileOnboardingScreen}/>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;
