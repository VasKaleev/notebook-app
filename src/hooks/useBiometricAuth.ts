import { useEffect, useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricState {
  isSupported: boolean; // есть ли железо
  isEnrolled: boolean; // настроен ли отпечаток/лицо
  isChecking: boolean; // идёт проверка при старте
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({
    isSupported: false,
    isEnrolled: false,
    isChecking: true,
  });

  // Проверяем железо и настроенность один раз при монтировании
  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setState({
          isSupported: hasHardware,
          isEnrolled: enrolled,
          isChecking: false,
        });
      } catch (e) {
        console.warn('[Biometric] check error:', e);
        setState((s) => ({ ...s, isChecking: false }));
      }
    })();
  }, []);

  /** Запустить системный запрос биометрии. Возвращает true, если пользователь прошёл. */
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.isEnrolled) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Разблокируйте «Мои заметки»',
        cancelLabel: 'Отмена',
        fallbackLabel: 'Использовать PIN-код', // iOS
        disableDeviceFallback: false, // разрешаем PIN устройства, если биометрия не сработала
      });
      return result.success;
    } catch (e) {
      console.warn('[Biometric] auth error:', e);
      return false;
    }
  }, [state.isSupported, state.isEnrolled]);

  return { ...state, authenticate };
}
