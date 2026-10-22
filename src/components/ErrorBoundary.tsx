import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Глобальный ErrorBoundary.
 * Ловит ошибки рендера и жизненного цикла React-компонентов.
 * НЕ ловит ошибки в асинхронном коде (Promise, setTimeout) —
 * для них нужны отдельные try/catch в сторах.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Поймана ошибка:', error);
    console.error('[ErrorBoundary] Стек компонентов:', info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRestart={this.handleRestart} />;
    }
    return this.props.children;
  }
}

/**
 * Отдельный функциональный компонент — чтобы использовать useTheme()
 * и useTranslation() из хуков. Класс не может вызывать хуки.
 */
function ErrorFallback({ error, onRestart }: { error: Error | null; onRestart: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Icon source="alert-circle-outline" size={96} color={theme.colors.error} />
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
        {t('errorBoundary.title')}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        {t('errorBoundary.description')}
      </Text>

      {/* Технические детали — видны только разработчику */}
      {error ? (
        <Text
          variant="labelSmall"
          style={[styles.errorText, { color: theme.colors.error }]}
          numberOfLines={4}>
          {error.message}
        </Text>
      ) : null}

      <Button
        mode="contained"
        icon="refresh"
        onPress={onRestart}
        style={styles.button}
        contentStyle={styles.buttonContent}>
        {t('errorBoundary.restart')}
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
  title: {
    marginTop: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
    opacity: 0.7,
  },
  button: {
    marginTop: 32,
    borderRadius: 28,
  },
  buttonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
