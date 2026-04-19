# Daily Mate Mobile Application

This is a React Native application for food recommendation based on weather conditions, personal preferences, and location. The app suggests meals that are suitable for the current weather, your dietary restrictions, and personal tastes.

## Features

- **Weather-based Recommendations**: Gets your location and weather data to suggest appropriate meals
- **Personal Profile**: Stores your dietary preferences, restrictions, and health goals
- **Ingredient Selection**: Allows you to select ingredients you already have to suggest recipes
- **History Tracking**: Keeps track of your meal suggestions and feedback
- **Offline Support**: Caches important data locally for offline access
- **Cross-platform Location**: Uses expo-location for reliable location services across all platforms

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation v6 (Stack + Bottom Tab)
- **Local DB**: expo-sqlite (SQLite)
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Location Services**: expo-location (cross-platform compatible)
- **Charts**: react-native-chart-kit

## Installation

1. Make sure you have Node.js installed
2. Install Expo CLI: `npm install -g @expo/cli`
3. Install dependencies: `npm install`
4. Run the application: 
   - For Android: `npx expo start --android`
   - For iOS: `npx expo start --ios`
   - For Web: `npx expo start --web`

## Project Structure

```
mobile_app/
├── App.js                 # Main application component
├── package.json           # Dependencies and scripts
├── babel.config.js        # Babel configuration
├── app.json              # Expo configuration
├── store/                # Zustand stores
│   └── useAppStore.js
├── utils/                # Utility functions
│   └── database.js
├── services/             # API services
│   └── api.js
└── screens/              # Screen components
    ├── HomeScreen.js
    ├── ProfileScreen.js
    ├── HistoryScreen.js
    ├── SettingsScreen.js
    ├── DishDetailScreen.js
    ├── MarketBasketScreen.js
    ├── HistoryDetailScreen.js
    ├── EditPersonalScreen.js
    ├── BodyMetricsScreen.js
    ├── AllergyScreen.js
    └── onboarding/
        ├── OnboardingWelcome.js
        ├── OnboardingPersonal.js
        └── OnboardingAllergy.js
```

## Screens

- **Home Screen**: Main screen showing weather card and food recommendations with real-time location
- **History Screen**: Shows past recommendations and meals with analytics
- **Profile Screen**: Manage personal information and preferences
- **Settings Screen**: App settings with persistent storage
- **Dish Detail**: Detailed dish information with feedback mechanism
- **Market Basket**: Ingredient selection from local database
- **Body Metrics**: Track weight, height, BMI with charts
- **Allergy Management**: Manage food allergies and restrictions
- **Edit Personal**: Update personal profile information

## Database Schema

The app uses SQLite for local storage with tables for:
- Personal profiles (`personal_profile`)
- Body metrics (`body_metrics`)
- Allergies (`allergy_list`)
- Ingredients (`ingredients_local`)
- Recommendation sessions (`recommendation_sessions`)
- Recommended dishes (`recommended_dishes`)
- Dish feedback (`dish_feedback`)
- Weather cache (`weather_cache_local`)
- Settings (`settings_kv`)

## API Integration

The app connects to our backend API at `api.wafrs.app` for:
- Weather data
- Food recommendations
- Ingredient information
- Feedback synchronization

## Key Improvements

### 1. Cross-platform Location Services
Uses `expo-location` instead of platform-specific APIs to ensure compatibility across iOS, Android, and Web platforms.

### 2. Personalized Recommendations
All user preferences (profile, allergies, dietary goals) are now properly integrated into the recommendation API calls.

### 3. Real Database Integration
- **Market Basket**: Reads from `ingredients_local` table
- **Settings**: Persistent storage in `settings_kv` table
- **Body Metrics**: Full CRUD operations with chart visualization
- **Allergies**: Toggle-based management with immediate store updates

### 4. Charts and Analytics
Body metrics screen includes interactive charts showing weight trends over time.

### 5. Error Handling
Improved error handling with user-friendly alerts and fallback mechanisms for offline scenarios.