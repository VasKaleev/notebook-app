import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface Props {
  onUnlock: () => void;
  onSkip: () => void;
  isSupported: boolean;
}

export default function LockScreen({ onUnlock, onSkip, isSupported }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupported) {
      const timer = setTimeout(() => {
        void handleUnlock();
      }, 400);
      return () => clearTimeout(timer);
    } else {
      onSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = async () => {
    setError(null);
    const LocalAuthentication = await import('expo-local-authentication');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.prompt'),
        cancelLabel: t('common.cancel'),
        fallbackLabel: t('lock.fallbackPin'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        onUnlock();
      } else {
        setError(t('lock.failed'));
      }
    } catch {
      setError(t('lock.error'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Icon source="fingerprint" size={96} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={styles.title}>
        {t('lock.title')}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        {t('lock.description')}
      </Text>

      {error ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 12 }}>
          {error}
        </Text>
      ) : null}

      <Button mode="contained" icon="fingerprint" onPress={handleUnlock} style={styles.button}>
        {t('lock.unlock')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: { marginTop: 24, fontWeight: '700', textAlign: 'center' },
  description: { marginTop: 12, textAlign: 'center', opacity: 0.8 },
  button: { marginTop: 32, borderRadius: 28 },
});
