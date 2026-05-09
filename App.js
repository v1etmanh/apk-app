/**
 * App.js — Auth-protected navigation
 * Luồng: loading → unauthenticated (Login) | authenticated → Onboarding | Main
 */

import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, View, Text, StyleSheet, Image } from 'react-native';
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

import { supabase } from './store/suppabase';
import { initDB, setSetting, migrateExistingProfile, getDeviceId, getActiveProfileId, setActiveProfileId, saveProfileMember } from './utils/database';
import { ensureFirebaseAuth } from './utils/firebaseConfig';
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
import MarketBasketScreen      from './screens/MarketBasketScreen';
import HistoryDetailScreen     from './screens/HistoryDetailScreen';
import EditPersonalScreen      from './screens/EditPersonalScreen';
import BodyMetricsScreen       from './screens/BodyMetricsScreen';
import AllergyScreen           from './screens/AllergyScreen';
import CookingChallengeScreen  from './screens/CookingChallengeScreen';
import TasteProfileScreen      from './screens/TasteProfileScreen';
// Onboarding screens đã bị loại bỏ — không import nữa
import RecommendScreen         from './screens/RecommendScreen';
import ResetPasswordScreen     from './screens/ResetPasswordScreen';
import AddEditProfileScreen    from './screens/AddEditProfileScreen';
import ChosenDishScreen        from './screens/ChosenDishScreen';
import MealReminderModal       from './components/MealReminderModal';

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
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor:   '#60A5FA',
      tabBarInactiveTintColor: '#8B7355',
      tabBarStyle: { backgroundColor: '#F5EDDC', borderTopColor: '#C8A96E', borderTopWidth: 1.5 },
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home"      component={HomeScreen}
      options={{ tabBarLabel: 'Trang chủ', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused}/> }}/>
   
    <Tab.Screen name="ChosenDish" component={ChosenDishScreen}
      options={{ tabBarLabel: 'Bữa hôm nay', tabBarIcon: ({ focused }) => <TabIcon emoji="🍱" focused={focused}/> }}/>
    <Tab.Screen name="History"   component={HistoryScreen}
      options={{ tabBarLabel: 'Lịch sử',   tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused}/> }}/>
    <Tab.Screen name="Profile"   component={ProfileScreen}
      options={{ tabBarLabel: 'Hồ sơ',     tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused}/> }}/>
    <Tab.Screen name="Settings"  component={SettingsScreen}
      options={{ tabBarLabel: 'Cài đặt',   tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused}/> }}/>
  </Tab.Navigator>
);

// ── Splash Screen (Lottie Lazy Cat) ──────────────────────────────────────
const SplashScreen = () => (
  <View style={sp.root}>
    {/* Layer 1 — wood background */}
    <Image
      source={TEX.wood}
      style={[StyleSheet.absoluteFillObject, { opacity: 0.82 }]}
      resizeMode="cover"
    />
    {/* Layer 2 — cream overlay */}
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(240,230,210,0.45)' }]} />

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
          <Text style={sp.title}>Daily Mate</Text>
          <Text style={sp.sub}>Đang chuẩn bị món ngon... 🍳</Text>

          {/* Loading dots */}
          <View style={sp.dotsRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[sp.dot, { opacity: 0.35 + i * 0.2 }]} />
            ))}
          </View>
        </View>
      </View>
    </View>

    {/* Footer */}
    <Text style={sp.footer}>🍜 Bạn đồng hành ẩm thực</Text>
  </View>
);

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
  const {
    loadProfile, loadLatestMetrics, loadAllergies,
    initializeLocation, initializeMaxPrepTime,
    initializeCostPreference, initializeIngredients,
    initializeSettings, loadAllProfilesAction,
    mealReminderModal, showMealReminderModal, hideMealReminderModal,
  } = useAppStore();

  // navigationRef — dùng để navigate từ notification listener (ngoài navigator context)
  const navigationRef = useRef(null);

  const [authState,      setAuthState]      = useState('loading');
  const [appReady,       setAppReady]       = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session ? 'authenticated' : 'unauthenticated');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? 'authenticated' : 'unauthenticated');
      if (!session) {
        setAppReady(false);
        // [FIX ID-M011] Xóa toàn bộ dữ liệu user khỏi store khi logout
        // Ngăn data leak: user A logout → user B login trên cùng thiết bị
        // không còn thấy profile/metrics/allergies của user A
        useAppStore.getState().resetStore();
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
    // Listener 1: User TAP vào notification (app đang background hoặc bị kill)
    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'MealReminder') {
        useAppStore.getState().showMealReminderModal({
          dishName:  data.dishName  || 'Món ăn hôm nay',
          mealLabel: data.mealId === 'lunch' ? 'Bữa trưa' : 'Bữa tối',
          mealId:    data.mealId   || 'lunch',
          nutrition: data.nutrition || null,
        });
      }
    });

    // Listener 2: Notification hiện khi app đang FOREGROUND
    const receiveSub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.screen === 'MealReminder') {
        useAppStore.getState().showMealReminderModal({
          dishName:  data.dishName  || 'Món ăn hôm nay',
          mealLabel: data.mealId === 'lunch' ? 'Bữa trưa' : 'Bữa tối',
          mealId:    data.mealId   || 'lunch',
          nutrition: data.nutrition || null,
        });
      }
    });

    return () => {
      responseSub.remove();
      receiveSub.remove();
    };
  }, []);

  useEffect(() => {
    if (authState === 'authenticated' && !appReady) initializeApp();
    if (authState === 'unauthenticated')            setAppReady(true);
  }, [authState]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // [AUD-006] Round 2 decimals (~1.1km) — app chỉ cần city-level, data minimization GDPR
      const lat = Math.round(loc.coords.latitude  * 100) / 100;
      const lon = Math.round(loc.coords.longitude * 100) / 100;
      setSetting('last_known_lat', String(lat));
      setSetting('last_known_lon', String(lon));
      if (__DEV__) console.warn('User location (rounded):', { lat, lon });
      return loc;
    } catch { return null; }
  };

  // ── Đăng ký Expo push token lên backend ──────────────────────────────────
  const registerDeviceToken = async (location) => {
    try {
      // Lấy Expo Push Token (dùng projectId từ app.json)
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return; // Chưa được quyền → skip

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

  const initializeApp = async () => {
    try {
      // Bước 1: chờ Firebase Auth sẵn sàng HOÀN TOÀN trước khi đụng Firestore.
      // ensureFirebaseAuth() gọi waitForFirebaseAuth() bên trong — block cho đến khi
      // onAuthStateChanged fire (session restore từ AsyncStorage) hoặc signInAnonymously xong.
      // Đây là root cause của "lần đầu đăng nhập không ghi được Firestore":
      // Firebase persistence là async, currentUser = null cho đến khi SDK load xong.
      await ensureFirebaseAuth();

      await initDB();

      // Migration: profile cũ → multi-profile schema (chỉ chạy 1 lần)
      await migrateExistingProfile();

      // Guard: nếu migration fail (Firestore write bị reject) và activeProfileId vẫn null
      // → tạo profile khẩn cấp. Lần này Firebase auth đã chắc chắn ready.
      let earlyProfileId = await getActiveProfileId();
      if (!earlyProfileId) {
        if (__DEV__) console.warn('[App] activeProfileId null sau migration — tạo profile khẩn cấp');
        const emergencyId = 'profile_' + Date.now().toString(36);
        await saveProfileMember({
          profileId:   emergencyId,
          displayName: 'Bản thân',
          relation:    'self',
          avatar:      '🧑',
          isDefault:   true,
          created_at:  new Date().toISOString(),
          updated_at:  new Date().toISOString(),
        });
        await setActiveProfileId(emergencyId);
        earlyProfileId = emergencyId;
      }

      // Sync activeProfileId vào Zustand NGAY, trước initializeSettings
      useAppStore.getState().setActiveProfileId(earlyProfileId);

      // Load settings (bao gồm activeProfileId, location, costPref, v.v.)
      await initializeSettings();

      // Load data song song
      await Promise.all([
        loadProfile(),
        loadLatestMetrics(),
        loadAllergies(),
        loadAllProfilesAction(),
        initializeIngredients(),
      ]);

      // Notification channel (Android 8+ bắt buộc)
      await setupNotificationChannel();

      // GPS + push token — chạy background, không block splash
      getUserLocation().then(loc => registerDeviceToken(loc));

      setShowOnboarding(false);
      setAppReady(true);
    } catch (e) {
      console.error('[App] initializeApp error:', e);
      // KHÔNG setAppReady(true) khi lỗi Firebase auth — retry khi authState thay đổi lại.
      // Chỉ setAppReady(true) nếu lỗi không phải permission/auth để tránh màn hình trắng mãi.
      const isAuthError = e?.code === 'permission-denied' || e?.message?.includes('permission');
      if (!isAuthError) {
        setAppReady(true);
      } else {
        console.warn('[App] Firebase permission error — giữ splash, chờ auth ổn định rồi retry');
        // Retry sau 2 giây
        setTimeout(() => {
          if (!appReady) initializeApp();
        }, 2000);
      }
    }
  };

  // Fonts chưa load hoặc đang khởi tạo → Splash với Lazy Cat
  if (!fontsLoaded || authState === 'loading' || (authState === 'authenticated' && !appReady)) {
    return <SplashScreen />;
  }

  // Chưa đăng nhập → LoginScreen
  if (authState === 'unauthenticated') {
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

  // Đã đăng nhập → toàn bộ app (onboarding đã bị loại bỏ)
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EDDC" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main"             component={MainTabs}/>
          <Stack.Screen name="DishDetail"       component={DishDetailScreen}/>
          <Stack.Screen name="MarketBasket"     component={MarketBasketScreen}/>
          <Stack.Screen name="HistoryDetail"    component={HistoryDetailScreen}/>
          <Stack.Screen name="EditPersonal"     component={EditPersonalScreen}/>
          <Stack.Screen name="BodyMetrics"      component={BodyMetricsScreen}/>
          <Stack.Screen name="Allergy"          component={AllergyScreen}/>
          <Stack.Screen name="CookingChallenge" component={CookingChallengeScreen}/>
          <Stack.Screen name="TasteProfile"     component={TasteProfileScreen}/>
          <Stack.Screen name="Recommend"        component={RecommendScreen}/>
          <Stack.Screen name="AddEditProfile"   component={AddEditProfileScreen}/>
        </Stack.Navigator>

        {/* Modal nhắc ăn — render ở root để hiện được từ bất kỳ màn hình nào */}
        <MealReminderModal
          visible={mealReminderModal.visible}
          dishName={mealReminderModal.dishName}
          mealLabel={mealReminderModal.mealLabel}
          mealId={mealReminderModal.mealId}
          nutrition={mealReminderModal.nutrition}
          onClose={hideMealReminderModal}
          onNavigate={() => {
            hideMealReminderModal();
            navigationRef.current?.navigate('Recommend');
          }}
        />
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;
