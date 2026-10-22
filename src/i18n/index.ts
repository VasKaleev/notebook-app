import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ru from './ru.json';
import en from './en.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

// Определяем язык системы: ru или en (fallback — en)
const systemLang = Localization.getLocales()[0]?.languageCode ?? 'en';
const defaultLang = systemLang === 'ru' ? 'ru' : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React сам экранирует
  },
  compatibilityJSON: 'v4', // для plural-форм в русском
});

export default i18n;
