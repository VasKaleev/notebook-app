import { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, IconButton, Text, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNotesStore } from '../store/notesStore';
import EmptyState from '../components/EmptyState';

export default function TrashScreen() {
  const { t, i18n } = useTranslation();

  const trashNotes = useNotesStore((s) => s.trashNotes);
  const loadTrash = useNotesStore((s) => s.loadTrash);
  const restoreNote = useNotesStore((s) => s.restoreNote);
  const permanentDelete = useNotesStore((s) => s.permanentDelete);
  const emptyTrash = useNotesStore((s) => s.emptyTrash);
  const error = useNotesStore((s) => s.error);
  const clearError = useNotesStore((s) => s.clearError);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  const handleEmptyTrash = () => {
    Alert.alert(t('trash.clearTitle'), t('trash.clearDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('trash.clear'),
        style: 'destructive',
        onPress: () => void emptyTrash(),
      },
    ]);
  };

  const handlePermanentDelete = (id: string) => {
    Alert.alert(t('trash.deleteForever'), t('trash.emptyDescription'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void permanentDelete(id),
      },
    ]);
  };

  // Локаль для даты удаления — из текущего языка
  const dateLocale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('trash.title')} />
        {trashNotes.length > 0 && <Appbar.Action icon="delete-sweep" onPress={handleEmptyTrash} />}
      </Appbar.Header>

      <Text variant="bodySmall" style={styles.hint}>
        {t('trash.hint')}
      </Text>

      <FlatList
        data={trashNotes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={trashNotes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="delete-outline"
            title={t('trash.empty')}
            description={t('trash.emptyDescription')}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" numberOfLines={1}>
                {item.title || t('notes.untitled')}
              </Text>
              <Text variant="bodySmall" style={styles.date}>
                {t('trash.deletedAt', {
                  date: new Date(item.deletedAt ?? 0).toLocaleDateString(dateLocale),
                })}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button icon="restore" onPress={() => void restoreNote(item.id)}>
                {t('trash.restore')}
              </Button>
              <IconButton
                icon="delete-forever"
                iconColor="#B3261E"
                onPress={() => handlePermanentDelete(item.id)}
              />
            </Card.Actions>
          </Card>
        )}
      />

      <Snackbar visible={!!error} onDismiss={clearError} duration={3000}>
        {error ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: { paddingHorizontal: 16, paddingVertical: 8, opacity: 0.6 },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  card: { marginHorizontal: 12, marginVertical: 4 },
  date: { marginTop: 4, opacity: 0.6 },
});
