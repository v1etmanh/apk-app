/**
 * App.js — Auth-protected navigation
 * Luồng: loading → unauthenticated (Login) | authenticated → Onboarding | Main
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Text, StyleSheet, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { initDB, setSetting } from './utils/database';
import { useAppStore } from './store/useAppStore';
import * as Location from 'expo-location';
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
import OnboardingWelcome       from './screens/onboarding/OnboardingWelcome';
import OnboardingPersonal      from './screens/onboarding/OnboardingPersonal';
import OnboardingAllergy       from './screens/onboarding/OnboardingAllergy';
import OnboardingProfileScreen from './screens/onboarding/OnBoardTast';
import RecommendScreen         from './screens/RecommendScreen';
import ResetPasswordScreen     from './screens/ResetPasswordScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

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
    <Tab.Screen name="recommend" component={RecommendScreen}
      options={{ tabBarLabel: 'Đề xuất',   tabBarIcon: ({ focused }) => <TabIcon emoji="💡" focused={focused}/> }}/>
    <Tab.Screen name="History"   component={HistoryScreen}
      options={{ tabBarLabel: 'Lịch sử',   tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused}/> }}/>
    <Tab.Screen name="Profile"   component={ProfileScreen}
      options={{ tabBarLabel: 'Hồ sơ',     tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused}/> }}/>
    <Tab.Screen name="Settings"  component={SettingsScreen}
      options={{ tabBarLabel: 'Cài đặt',   tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused}/> }}/>
  </Tab.Navigator>
);

// ── Onboarding Stack ──────────────────────────────────────────────────────
const OnboardingStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OnboardingWelcome"  component={OnboardingWelcome}/>
    <Stack.Screen name="OnboardingPersonal" component={OnboardingPersonal}/>
    <Stack.Screen name="OnboardingAllergy"  component={OnboardingAllergy}/>
    <Stack.Screen name="TasteProfile"       component={OnboardingProfileScreen}/>
  </Stack.Navigator>
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
  } = useAppStore();

  const [authState,      setAuthState]      = useState('loading');
  const [appReady,       setAppReady]       = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReset,      setShowReset]      = useState(false); // ← reset password flow

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
      if (!session) setAppReady(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Deep link handler: email confirm / reset password
  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;

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

  useEffect(() => {
    if (authState === 'authenticated' && !appReady) initializeApp();
    if (authState === 'unauthenticated')            setAppReady(true);
  }, [authState]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setSetting('last_known_lat', String(loc.coords.latitude));
      setSetting('last_known_lon', String(loc.coords.longitude));
      console.warn('User location:', loc.coords);
      return loc;
    } catch { return null; }
  };

  const initializeApp = async () => {
    try {
      await initDB();
      await loadProfile();
      await loadLatestMetrics();
      await loadAllergies();
      await initializeLocation();
      getUserLocation();
      await initializeIngredients();
      const onboardingDone = await AsyncStorage.getItem('onboarding_done');
      setShowOnboarding(!onboardingDone);
      setAppReady(true);
    } catch (e) {
      console.error('initializeApp error:', e);
      setAppReady(true);
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

  // Đã đăng nhập → toàn bộ app
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EDDC" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showOnboarding ? (
            <Stack.Screen name="Onboarding" component={OnboardingStack}/>
          ) : (
            <>
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
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;
