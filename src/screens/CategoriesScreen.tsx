import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { useCategoriesStore } from '../store/categoriesStore';
import { EmptyState } from '../components';

const COLORS = ['#6750A4', '#FF5722', '#4CAF50', '#2196F3', '#FFC107', '#E91E63'];

export default function CategoriesScreen() {
  const { t, i18n } = useTranslation();

  const categories = useCategoriesStore((s) => s.categories);
  const counts = useCategoriesStore((s) => s.counts);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const editCategory = useCategoriesStore((s) => s.editCategory);
  const removeCategory = useCategoriesStore((s) => s.removeCategory);
  const loadCategories = useCategoriesStore((s) => s.loadCategories);
  const error = useCategoriesStore((s) => s.error);
  const clearError = useCategoriesStore((s) => s.clearError);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Принудительная перерисовка при изменении counts
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick((val) => val + 1);
  }, [counts]);

  // Загружаем счётчики при монтировании экрана
  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setColor(COLORS[0]);
    setDialogOpen(true);
  };

  const openEdit = (id: string, n: string, c: string) => {
    setEditingId(id);
    setName(n);
    setColor(c);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await editCategory(editingId, { name: name.trim(), color });
      } else {
        await addCategory({ name: name.trim(), color });
      }
    } catch (e) {
      console.error('[Categories] save:', e);
    } finally {
      setDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeCategory(deleteId);
    } finally {
      setDeleteId(null);
    }
  };

  // Счётчик с plural-формами: «1 заметка», «2 заметки», «5 заметок»
  const getDescription = (id: string): string => {
    const count = counts.get(id) ?? 0;
    if (count === 0) return t('categories.noNotes');
    return t('categories.notesCount', { count });
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('categories.title')} />
      </Appbar.Header>

      <FlatList
        key={`list-${tick}-${i18n.language}`}
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={categories.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="folder-plus-outline"
            title={t('categories.empty')}
            description={t('categories.emptyDescription')}
            actionLabel={t('categories.createCategory')}
            onAction={openCreate}
          />
        }
        renderItem={({ item }) => {
          const desc = getDescription(item.id);
          console.log('[Categories] renderItem:', item.name, '→', desc);
          return (
            <List.Item
              title={item.name}
              description={desc}
              onPress={() => openEdit(item.id, item.name, item.color)}
              left={() => <View style={[styles.dot, { backgroundColor: item.color }]} />}
              right={() => (
                <IconButton icon="delete-outline" onPress={() => setDeleteId(item.id)} />
              )}
            />
          );
        }}
      />

      <FAB icon="plus" style={styles.fab} onPress={openCreate} />

      <Portal>
        {dialogOpen && (
          <Dialog visible onDismiss={() => setDialogOpen(false)}>
            <Dialog.Title>
              {editingId ? t('categories.editCategory') : t('categories.newCategory')}
            </Dialog.Title>
            <Dialog.Content>
              <TextInput
                mode="outlined"
                label={t('categories.namePlaceholder')}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <Text variant="labelMedium" style={{ marginTop: 16 }}>
                {t('categories.color')}
              </Text>
              <View style={styles.colors}>
                {COLORS.map((c) => (
                  <IconButton
                    key={c}
                    icon={color === c ? 'check-circle' : 'circle'}
                    iconColor={c}
                    size={28}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onPress={handleSave}>{t('common.save')}</Button>
            </Dialog.Actions>
          </Dialog>
        )}

        {deleteId && (
          <Dialog visible onDismiss={() => setDeleteId(null)}>
            <Dialog.Title>{t('categories.deleteTitle')}</Dialog.Title>
            <Dialog.Content>
              <Text>{t('categories.deleteDescription')}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDeleteId(null)}>{t('common.cancel')}</Button>
              <Button onPress={handleDelete} textColor="#B3261E">
                {t('common.delete')}
              </Button>
            </Dialog.Actions>
          </Dialog>
        )}
      </Portal>

      <Snackbar visible={!!error} onDismiss={clearError} duration={3000}>
        {error ? t(error) : ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 96 },
  empty: { flexGrow: 1 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginLeft: 16,
  },
  colors: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  fab: { position: 'absolute', right: 16, bottom: 24 },
});
