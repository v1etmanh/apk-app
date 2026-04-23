import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
import { initDB } from './utils/database';
import { useAppStore } from './store/useAppStore';
import HomeScreen from './screens/HomeScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import DishDetailScreen from './screens/DishDetailScreen';
import MarketBasketScreen from './screens/MarketBasketScreen';
import HistoryDetailScreen from './screens/HistoryDetailScreen';
import EditPersonalScreen from './screens/EditPersonalScreen';
import BodyMetricsScreen from './screens/BodyMetricsScreen';
import AllergyScreen from './screens/AllergyScreen';
import CookingChallengeScreen from './screens/CookingChallengeScreen';
import TasteProfileScreen from './screens/TasteProfileScreen';
import OnboardingWelcome from './screens/onboarding/OnboardingWelcome';
import OnboardingPersonal from './screens/onboarding/OnboardingPersonal';
import OnboardingAllergy from './screens/onboarding/OnboardingAllergy';
import OnboardingProfileScreen from './screens/onboarding/OnBoardTast';
import RecommendScreen from './screens/RecommendScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#8B5E3C', // Using primary wood color
        tabBarInactiveTintColor: '#A67C52', // Using woodLight color
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="recommend" 
        component={RecommendScreen} 
        options={{ 
          tabBarLabel: 'Đề xuất',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bulb" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ 
          tabBarLabel: 'Lịch sử',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          )
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" color={color} size={size} />
          )
        }}
      />
      
    </Tab.Navigator>
  );
};

const OnboardingStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />
      <Stack.Screen name="OnboardingPersonal" component={OnboardingPersonal} />
      <Stack.Screen name="OnboardingAllergy" component={OnboardingAllergy} />
      <Stack.Screen name="TasteProfile" component={OnboardingProfileScreen} />
    </Stack.Navigator>
  );
};

const App = () => {
  const { profile, loadProfile, loadLatestMetrics, loadAllergies, initializeLocation,initializeMaxPrepTime,initializeCostPreference, initializeIngredients } = useAppStore();
  const [appReady, setAppReady] = useState(false);
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
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await initDB();
      
      // Load user data
      await loadProfile();
      await loadLatestMetrics();
      await loadAllergies();
      await initializeLocation();
      await initializeMaxPrepTime();
      await initializeCostPreference();
      initializeIngredients(); // non-blocking — load ingredients song song
      // Check if onboarding is completed
      const onboardingDone = await AsyncStorage.getItem('onboarding_done');
      setShowOnboarding(!onboardingDone);
      
      setAppReady(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      setAppReady(true);
    }
  };

  if (!appReady || !fontsLoaded) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5EDDC' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5EDDC" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {showOnboarding ? (
              <Stack.Screen name="Onboarding" component={OnboardingStack} />
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="DishDetail" component={DishDetailScreen} />
                <Stack.Screen name="MarketBasket" component={MarketBasketScreen} />
                <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
                <Stack.Screen name="EditPersonal" component={EditPersonalScreen} />
                <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} />
                <Stack.Screen name="Allergy" component={AllergyScreen} />
                <Stack.Screen name="CookingChallenge" component={CookingChallengeScreen} />
                <Stack.Screen name="TasteProfile" component={TasteProfileScreen} />
                <Stack.Screen name="Recommend" component={RecommendScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;
