import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type SortBy = 'updatedAt' | 'createdAt' | 'title';
export type AppLanguage = 'system' | 'ru' | 'en';

const STORAGE_KEY = 'settings:v1';

interface PersistedSettings {
  themeMode?: ThemeMode;
  onboardingPassed?: boolean;
  defaultSortBy?: SortBy;
  language?: AppLanguage;
}

interface SettingsState {
  themeMode: ThemeMode;
  onboardingPassed: boolean;
  defaultSortBy: SortBy;
  language: AppLanguage;
  isHydrated: boolean;
  setThemeMode: (m: ThemeMode) => Promise<void>;
  setDefaultSortBy: (s: SortBy) => Promise<void>;
  setLanguage: (l: AppLanguage) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themeMode: 'system',
  onboardingPassed: false,
  defaultSortBy: 'updatedAt',
  language: 'system',
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedSettings;
        set({
          themeMode: parsed.themeMode ?? 'system',
          onboardingPassed: parsed.onboardingPassed ?? false,
          defaultSortBy: parsed.defaultSortBy ?? 'updatedAt',
          language: parsed.language ?? 'system',
        });
      }
    } catch (e) {
      console.warn('[settings] hydrate:', e);
    } finally {
      set({ isHydrated: true });
    }
  },

  setThemeMode: async (m) => {
    set({ themeMode: m });
    try {
      const payload: PersistedSettings = {
        themeMode: get().themeMode,
        onboardingPassed: get().onboardingPassed,
        defaultSortBy: get().defaultSortBy,
        language: get().language,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[settings] persist theme:', e);
    }
  },

  setDefaultSortBy: async (s) => {
    set({ defaultSortBy: s });
    try {
      const payload: PersistedSettings = {
        themeMode: get().themeMode,
        onboardingPassed: get().onboardingPassed,
        defaultSortBy: s,
        language: get().language,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[settings] persist sort:', e);
    }
  },

  setLanguage: async (l) => {
    set({ language: l });
    try {
      const payload: PersistedSettings = {
        themeMode: get().themeMode,
        onboardingPassed: get().onboardingPassed,
        defaultSortBy: get().defaultSortBy,
        language: l,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[settings] persist language:', e);
    }
  },

  completeOnboarding: async () => {
    set({ onboardingPassed: true });
    try {
      const payload: PersistedSettings = {
        themeMode: get().themeMode,
        onboardingPassed: true,
        defaultSortBy: get().defaultSortBy,
        language: get().language,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[settings] persist onboarding:', e);
    }
  },
}));
