import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '../store/settingsStore';

const { width } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: string;
  title: string;
  description: string;
}

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  // Слайды строим внутри компонента — чтобы при смене языка
  // заголовки и описания обновились (t() зависит от i18n.language)
  const slides: Slide[] = useMemo(
    () => [
      {
        key: 'welcome',
        icon: 'notebook-outline',
        title: t('onboarding.slide1Title'),
        description: t('onboarding.slide1Description'),
      },
      {
        key: 'categories',
        icon: 'folder-multiple-outline',
        title: t('onboarding.slide2Title'),
        description: t('onboarding.slide2Description'),
      },
      {
        key: 'backup',
        icon: 'shield-check-outline',
        title: t('onboarding.slide3Title'),
        description: t('onboarding.slide3Description'),
      },
    ],
    [t],
  );

  const isLast = index === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      void finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const finish = async () => {
    await completeOnboarding();
    onDone();
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== index) setIndex(newIndex);
  };

  const renderSlide = ({ item }: ListRenderItemInfo<Slide>) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
        <Icon source={item.icon} size={96} color={theme.colors.onPrimaryContainer} />
      </View>
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
        {item.title}
      </Text>
      <Text
        variant="bodyLarge"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Кнопка «Пропустить» */}
      <View style={styles.topBar}>
        <Button compact onPress={() => void finish()} textColor={theme.colors.onSurfaceVariant}>
          {t('onboarding.skip')}
        </Button>
      </View>

      {/* Слайды */}
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(s) => s.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
      />

      {/* Индикатор страниц */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? theme.colors.primary : theme.colors.surfaceVariant,
                width: i === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Нижняя кнопка */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.cta}
          contentStyle={styles.ctaContent}>
          {isLast ? t('onboarding.start') : t('onboarding.next')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cta: {
    borderRadius: 28,
  },
  ctaContent: {
    paddingVertical: 8,
  },
});
