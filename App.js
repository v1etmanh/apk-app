import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, View, Text } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 16, color: focused ? '#007AFF' : '#666' }}>🏠</Text>
          )
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ 
          tabBarLabel: 'Lịch sử',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 16, color: focused ? '#007AFF' : '#666' }}>📅</Text>
          )
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 16, color: focused ? '#007AFF' : '#666' }}>👤</Text>
          )
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 16, color: focused ? '#007AFF' : '#666' }}>⚙️</Text>
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

  if (!appReady) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading...</Text></View>;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;