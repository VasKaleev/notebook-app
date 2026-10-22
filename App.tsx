import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Localization from 'expo-localization';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from 'i18next';
import { requestWidgetUpdate } from 'react-native-android-widget';

// Инициализация i18next (side-effect import — должен быть до использования t)
import './src/i18n';

import RootNavigator from './src/navigation/RootNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LockScreen from './src/screens/LockScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { NotesWidget } from './src/widgets/android/NotesWidget';
import { paperLightTheme, paperDarkTheme } from './src/theme/paperTheme';
import { useSettingsStore } from './src/store/settingsStore';
import { useNotesStore } from './src/store/notesStore';
import { useCategoriesStore } from './src/store/categoriesStore';
import { useBiometricAuth } from './src/hooks/useBiometricAuth';
import { initNotifications } from './src/services/notifications';
import * as NotesRepo from './src/db/notes.repo';
import * as AttachmentsRepo from './src/db/attachments.repo';

void SplashScreen.preventAutoHideAsync();

export default function App() {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const isHydrated = useSettingsStore((s) => s.isHydrated);
  const onboardingPassed = useSettingsStore((s) => s.onboardingPassed);
  const language = useSettingsStore((s) => s.language);

  const loadNotes = useNotesStore((s) => s.loadNotes);
  const loadCategories = useCategoriesStore((s) => s.loadCategories);
  const notes = useNotesStore((s) => s.notes);

  const biometric = useBiometricAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  // 0. Синхронизация языка с i18next
  useEffect(() => {
    if (language === 'system') {
      const sys = Localization.getLocales()[0]?.languageCode ?? 'en';
      void i18n.changeLanguage(sys === 'ru' ? 'ru' : 'en');
    } else {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  // 1. Загрузка настроек, данных, уведомлений, очистка корзины и сиротских файлов
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await hydrate();

        // Читаем сохранённую сортировку из settingsStore
        const { defaultSortBy } = useSettingsStore.getState();
        const { applyDefaultSort } = useNotesStore.getState();

        await Promise.all([loadCategories(), loadNotes()]);
        applyDefaultSort(defaultSortBy);

        // Удаляем заметки из корзины старше 30 дней
        const purgedTrash = await NotesRepo.purgeOldTrash();
        if (purgedTrash > 0) {
          console.log(`[App] Очищено из корзины: ${purgedTrash}`);
        }

        // Удаляем файлы вложений, на которые нет ссылок в БД
        const purgedFiles = await AttachmentsRepo.cleanupOrphanFiles();
        if (purgedFiles > 0) {
          console.log(`[App] Удалено сиротских файлов: ${purgedFiles}`);
        }

        // Инициализация уведомлений (в Expo Go — no-op, не падает)
        await initNotifications();
      } catch (e) {
        console.warn('[App] bootstrap error:', e);
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrate, loadCategories, loadNotes]);

  // 2. Скрываем splash, когда всё готово
  useEffect(() => {
    if (bootstrapped && isHydrated) {
      SplashScreen.hideAsync().catch((e) => {
        console.warn('[App] splash hide error:', e);
      });
    }
  }, [bootstrapped, isHydrated]);

  // 3. Обновляем виджет при каждом изменении списка заметок
  useEffect(() => {
    if (!bootstrapped) return;

    const notesForWidget = notes.slice(0, 3).map((n) => ({ id: n.id, title: n.title }));

    void requestWidgetUpdate({
      widgetName: 'NotesWidget',
      renderWidget: () => <NotesWidget notes={notesForWidget} />,
      widgetNotFound: () => {
        // Виджет не добавлен на главный экран — ничего не делаем
      },
    }).catch((e) => {
      // В Expo Go / на iOS виджетов нет — просто игнорируем
      console.warn('[App] requestWidgetUpdate:', e);
    });
  }, [notes, bootstrapped]);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const paperTheme = isDark ? paperDarkTheme : paperLightTheme;

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: paperTheme.colors.primary,
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.surfaceVariant,
      },
    }),
    [isDark, paperTheme],
  );

  if (!bootstrapped || !isHydrated) return null;

  // Показывать LockScreen, если биометрия поддерживается и настроена
  const showLock =
    biometric.isSupported && biometric.isEnrolled && !biometric.isChecking && !isUnlocked;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <ErrorBoundary>
          <StatusBar style={isDark ? 'light' : 'dark'} />

          {showLock ? (
            <LockScreen
              isSupported={biometric.isSupported}
              onUnlock={() => setIsUnlocked(true)}
              onSkip={() => setIsUnlocked(true)}
            />
          ) : !onboardingPassed ? (
            <OnboardingScreen onDone={() => {}} />
          ) : (
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
          )}
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
