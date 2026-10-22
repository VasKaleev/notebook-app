import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface Props {
  text: string;
  query: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Подсвечивает все вхождения слов из query в text.
 * Разбивает текст на части: обычные и совпавшие, рендерит массив <Text>.
 * Работает с кириллицей (toLowerCase для сравнения).
 */
export default function HighlightedText({ text, query, numberOfLines, style }: Props) {
  const theme = useTheme();

  // Если запроса нет — возвращаем обычный текст
  const trimmed = query.trim();
  if (!trimmed) {
    return (
      <Text numberOfLines={numberOfLines} style={style}>
        {text}
      </Text>
    );
  }

  // Разбиваем запрос на слова (длина >= 2, как в поиске)
  const words = trimmed
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.toLowerCase());

  if (words.length === 0) {
    return (
      <Text numberOfLines={numberOfLines} style={style}>
        {text}
      </Text>
    );
  }

  // Собираем все вхождения слов в текст — позиции начала/конца
  const lower = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];

  words.forEach((word) => {
    let idx = lower.indexOf(word);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + word.length });
      idx = lower.indexOf(word, idx + word.length);
    }
  });

  // Если совпадений нет — обычный текст
  if (ranges.length === 0) {
    return (
      <Text numberOfLines={numberOfLines} style={style}>
        {text}
      </Text>
    );
  }

  // Сортируем и объединяем пересекающиеся диапазоны
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }

  // Строим массив частей: обычный / подсвеченный
  const parts: { text: string; highlight: boolean }[] = [];
  let cursor = 0;
  for (const { start, end } of merged) {
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), highlight: false });
    }
    parts.push({ text: text.slice(start, end), highlight: true });
    cursor = end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlight: false });
  }

  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {parts.map((p, i) =>
        p.highlight ? (
          <Text
            key={i}
            style={[
              styles.highlight,
              {
                backgroundColor: theme.colors.primaryContainer,
                color: theme.colors.onPrimaryContainer,
              },
            ]}>
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    fontWeight: '700',
    borderRadius: 2,
  },
});
