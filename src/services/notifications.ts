import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Проверяем, запущено ли приложение в Expo Go.
 * В Expo Go на Android импорт expo-notifications фатален —
 * поэтому мы не импортируем его на верхнем уровне.
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/** Ленивая загрузка expo-notifications. Возвращает null в Expo Go. */
async function loadNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (isExpoGo()) {
    console.warn(
      '[notifications] Expo Go не поддерживает expo-notifications. ' +
        'Используйте development build.',
    );
    return null;
  }
  try {
    return await import('expo-notifications');
  } catch (e) {
    console.warn('[notifications] не удалось загрузить модуль:', e);
    return null;
  }
}

/**
 * Инициализация обработчика уведомлений.
 * Вызывается один раз из App.tsx в useEffect.
 * В Expo Go — no-op.
 */
export async function initNotifications(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Запросить разрешение. В Expo Go — false. */
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Android-канал. В Expo Go — no-op. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Напоминания',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#6750A4',
  });
}

/**
 * Запланировать напоминание.
 * В Expo Go возвращает null (не падает).
 */
export async function scheduleNoteReminder(
  noteId: string,
  title: string,
  date: Date,
): Promise<string | null> {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermission();
  if (!granted) throw new Error('Нет разрешения на уведомления');

  await ensureAndroidChannel();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Напоминание',
      body: title || 'Заметка',
      data: { noteId },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'reminders',
    },
  });

  return id;
}

/** Отменить уведомление. В Expo Go — no-op. */
export async function cancelNoteReminder(notificationId: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('[notifications] cancel:', e);
  }
}
