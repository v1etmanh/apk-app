import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import vi from './locales/vi';
import en from './locales/en';

export const LANGUAGE_KEY = 'language';
export const SUPPORTED_LANGUAGES = ['vi', 'en'];

const deviceLanguage = getLocales()?.[0]?.languageCode;
const initialLanguage = SUPPORTED_LANGUAGES.includes(deviceLanguage) ? deviceLanguage : 'vi';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: initialLanguage,
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export async function restoreLanguage() {
  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  const language = SUPPORTED_LANGUAGES.includes(savedLanguage) ? savedLanguage : initialLanguage;
  if (i18n.language !== language) await i18n.changeLanguage(language);
  return language;
}

export async function changeLanguage(language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) return i18n.language;
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
  await i18n.changeLanguage(language);
  return language;
}

export default i18n;
