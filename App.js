/**
 * App.js — Auth-protected navigation
 * Luồng: loading → unauthenticated (Login) | authenticated → Onboarding | Main
 */

import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
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
import { initDB,setSetting } from './utils/database';
import { useAppStore } from './store/useAppStore';
import * as Location from 'expo-location';
import LoginScreen            from './screens/LoginScreen';
import HomeScreen             from './screens/HomeScreen';
import HistoryScreen          from './screens/HistoryScreen';
import ProfileScreen          from './screens/ProfileScreen';
import SettingsScreen         from './screens/SettingsScreen';
import DishDetailScreen       from './screens/DishDetailScreen';
import MarketBasketScreen     from './screens/MarketBasketScreen';
import HistoryDetailScreen    from './screens/HistoryDetailScreen';
import EditPersonalScreen     from './screens/EditPersonalScreen';
import BodyMetricsScreen      from './screens/BodyMetricsScreen';
import AllergyScreen          from './screens/AllergyScreen';
import CookingChallengeScreen from './screens/CookingChallengeScreen';
import TasteProfileScreen     from './screens/TasteProfileScreen';
import OnboardingWelcome      from './screens/onboarding/OnboardingWelcome';
import OnboardingPersonal     from './screens/onboarding/OnboardingPersonal';
import OnboardingAllergy      from './screens/onboarding/OnboardingAllergy';
import OnboardingProfileScreen from './screens/onboarding/OnBoardTast';
import RecommendScreen        from './screens/RecommendScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

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

// ── Splash ────────────────────────────────────────────────────────────────
const SplashScreen = () => (
  <View style={sp.root}>
    <Text style={sp.emoji}>🍳</Text>
    <Text style={sp.title}>Daily Mate</Text>
    <Text style={sp.sub}>Đang chuẩn bị món ngon...</Text>
  </View>
);
const sp = StyleSheet.create({
  root:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5EDDC' },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 22, color: '#8B5E3C', fontWeight: '700' },
  sub:   { fontSize: 14, color: '#C8A96E', marginTop: 6 },
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
  const [fontsLoaded] = useFonts({
    Nunito: BeVietnamPro_400Regular,
    'Nunito-Regular': BeVietnamPro_400Regular,
    'Nunito-Bold': BeVietnamPro_700Bold,
    Nunito_400Regular: BeVietnamPro_400Regular,
    Nunito_600SemiBold: BeVietnamPro_600SemiBold,
    Nunito_700Bold: BeVietnamPro_700Bold,
    'Patrick Hand': Lora_700Bold,
    'PatrickHand-Regular': Lora_700Bold,
    Caveat_400Regular: Lora_600SemiBold,
    Caveat_700Bold: Lora_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session ? 'authenticated' : 'unauthenticated');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? 'authenticated' : 'unauthenticated');
      if (!session) setAppReady(false); // reset khi logout
    });

    return () => subscription.unsubscribe();
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
      return 
    } catch { return null; }
  };
  const initializeApp = async () => {
    const startTime = Date.now();
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

  // Đang load
  if (authState === 'loading' || (authState === 'authenticated' && !appReady)) {
    return <SplashScreen />;
  }

  // ✅ Chưa đăng nhập → chỉ thấy LoginScreen, không vào được route nào khác
  if (authState === 'unauthenticated') {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#8B5E3C" />
        <LoginScreen />
      </>
    );
  }

  // ✅ Đã đăng nhập → toàn bộ app
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
