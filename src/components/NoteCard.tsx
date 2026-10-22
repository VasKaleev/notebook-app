import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, IconButton, Icon, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Note } from '../types/models';
import HighlightedText from './HighlightedText';

interface Props {
  note: Note;
  categoryName?: string;
  categoryColor?: string;
  searchQuery?: string;
  checklistProgress?: { checked: number; total: number };
  onPress: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

function NoteCardComponent({
  note,
  categoryName,
  categoryColor,
  searchQuery = '',
  checklistProgress,
  onPress,
  onTogglePin,
  onDelete,
}: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  const isChecklist = note.noteType === 'checklist';

  const preview =
    note.content.length > 100
      ? note.content.slice(0, 100) + '…'
      : note.content;

  // Локаль даты — из текущего языка
  const dateLocale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  const dateStr = new Date(note.updatedAt).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePress = useCallback(() => onPress(note.id), [onPress, note.id]);
  const handlePin = useCallback(
    () => onTogglePin(note.id),
    [onTogglePin, note.id],
  );
  const handleDelete = useCallback(
    () => onDelete(note.id),
    [onDelete, note.id],
  );

  return (
    <Card style={styles.card} onPress={handlePress} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          {/* Иконка режима — перед заголовком */}
          {isChecklist ? (
            <Icon
              source="checkbox-marked-outline"
              size={18}
              color={theme.colors.primary}
            />
          ) : null}
          <HighlightedText
            text={note.title || t('notes.untitled')}
            query={searchQuery}
            numberOfLines={1}
            style={styles.title}
          />
          <IconButton
            icon={note.isPinned ? 'pin' : 'pin-outline'}
            size={20}
            onPress={handlePin}
            style={styles.pin}
          />
        </View>

        {/* Тело: для чек-листа — прогресс, для текста — превью */}
        {isChecklist ? (
          <View style={styles.checklistBadge}>
            <Icon
              source="format-list-checks"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.checklistProgress}>
              {checklistProgress
                ? `${checklistProgress.checked}/${checklistProgress.total}`
                : '0/0'}
            </Text>
          </View>
        ) : preview ? (
          <HighlightedText
            text={preview}
            query={searchQuery}
            numberOfLines={2}
            style={styles.preview}
          />
        ) : null}

        <View style={styles.footer}>
          {categoryName ? (
            <View style={styles.badge}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: categoryColor ?? '#999' },
                ]}
              />
              <Text variant="labelSmall">{categoryName}</Text>
            </View>
          ) : (
            <View />
          )}
          <Text variant="labelSmall" style={styles.date}>
            {dateStr}
          </Text>
        </View>
      </Card.Content>

      <Card.Actions style={styles.actions}>
        <IconButton icon="delete-outline" size={20} onPress={handleDelete} />
      </Card.Actions>
    </Card>
  );
}

function arePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.note.id === next.note.id &&
    prev.note.title === next.note.title &&
    prev.note.content === next.note.content &&
    prev.note.isPinned === next.note.isPinned &&
    prev.note.updatedAt === next.note.updatedAt &&
    prev.note.categoryId === next.note.categoryId &&
    prev.note.noteType === next.note.noteType &&
    prev.note.audioUri === next.note.audioUri &&
    prev.categoryName === next.categoryName &&
    prev.categoryColor === next.categoryColor &&
    prev.searchQuery === next.searchQuery &&
    prev.checklistProgress?.checked === next.checklistProgress?.checked &&
    prev.checklistProgress?.total === next.checklistProgress?.total &&
    prev.onPress === next.onPress &&
    prev.onTogglePin === next.onTogglePin &&
    prev.onDelete === next.onDelete
  );
}

export default memo(NoteCardComponent, arePropsEqual);

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1 },
  pin: { margin: 0 },
  preview: { marginTop: 4, opacity: 0.8 },
  checklistBadge: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checklistProgress: { opacity: 0.7 },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  date: { opacity: 0.6 },
  actions: { justifyContent: 'flex-end', paddingVertical: 0 },
});