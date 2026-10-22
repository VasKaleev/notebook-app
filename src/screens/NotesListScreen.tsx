import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Appbar, Chip, FAB, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { useNotesStore } from '../store/notesStore';
import { useCategoriesStore } from '../store/categoriesStore';
import { useDebounce } from '../hooks/useDebounce';
import { NoteCard, SearchBar, EmptyState, SortMenu } from '../components';
import type { Note } from '../types/models';

export default function NotesListScreen() {
  const { t, i18n } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const notes = useNotesStore((s) => s.notes);
  const isLoading = useNotesStore((s) => s.isLoading);
  const error = useNotesStore((s) => s.error);
  const search = useNotesStore((s) => s.search);
  const sortBy = useNotesStore((s) => s.sortBy);
  const categoryId = useNotesStore((s) => s.categoryId);
  const setSearch = useNotesStore((s) => s.setSearch);
  const setSortBy = useNotesStore((s) => s.setSortBy);
  const setCategoryFilter = useNotesStore((s) => s.setCategoryFilter);
  const togglePin = useNotesStore((s) => s.togglePin);
  const removeNote = useNotesStore((s) => s.removeNote);
  const clearError = useNotesStore((s) => s.clearError);

  const categories = useCategoriesStore((s) => s.categories);

  const [searchInput, setSearchInput] = useState(search);
  const debounced = useDebounce(searchInput, 300);

  // Синхронизация поиска со стором — только когда debounced изменился.
  useEffect(() => {
    if (debounced !== search) setSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const catMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    categories.forEach((c) => map.set(c.id, { name: c.name, color: c.color }));
    return map;
  }, [categories]);

  const handleOpenNote = useCallback(
    (id: string) => nav.navigate('NoteEdit', { noteId: id }),
    [nav],
  );
  const handleTogglePin = useCallback((id: string) => void togglePin(id), [togglePin]);
  const handleDelete = useCallback((id: string) => void removeNote(id), [removeNote]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => {
      const cat = item.categoryId ? catMap.get(item.categoryId) : undefined;
      return (
        <NoteCard
          note={item}
          categoryName={cat?.name}
          categoryColor={cat?.color}
          searchQuery={search}
          onPress={handleOpenNote}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
        />
      );
    },
    [catMap, search, handleOpenNote, handleTogglePin, handleDelete],
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title={t('notes.title')} />
        <SortMenu value={sortBy} onChange={setSortBy} />
      </Appbar.Header>

      <SearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder={t('notes.search')}
      />

      {categories.length > 0 && (
        <View style={styles.chipsWrapper}>
          <FlatList
            key={`chips-${i18n.language}`}
            horizontal
            data={[{ id: '__all__', name: t('notes.all'), color: '' }, ...categories]}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
            renderItem={({ item }) => {
              const active =
                (item.id === '__all__' && categoryId === null) || item.id === categoryId;
              return (
                <Chip
                  selected={active}
                  showSelectedCheck={false}
                  onPress={() => setCategoryFilter(item.id === '__all__' ? null : item.id)}
                  style={[styles.chip, active && styles.chipActive]}
                  textStyle={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Chip>
              );
            }}
          />
        </View>
      )}

      <FlatList
        key={i18n.language}
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={notes.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={search ? 'magnify' : 'note-plus-outline'}
              title={search ? t('notes.notFound') : t('notes.empty')}
              description={search ? t('notes.notFoundDescription') : t('notes.emptyDescription')}
              actionLabel={search ? undefined : t('notes.createNote')}
              onAction={search ? undefined : () => nav.navigate('NoteEdit', {})}
            />
          )
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => nav.navigate('NoteEdit', { categoryId })}
      />

      <Snackbar visible={!!error} onDismiss={clearError} duration={3000}>
        {error ? t(error) : ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  list: { paddingBottom: 96, paddingTop: 4 },
  emptyList: { flexGrow: 1 },

  chipsWrapper: {
    minHeight: 56,
    justifyContent: 'center',
  },
  chipsContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#E7E0EC',
    height: 36,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#6750A4',
  },
  chipText: {
    color: '#1D1B20',
    fontSize: 13,
    includeFontPadding: false,
    marginVertical: 0,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  fab: { position: 'absolute', right: 16, bottom: 24 },
});
