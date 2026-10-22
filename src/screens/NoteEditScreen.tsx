import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Button,
  Checkbox,
  IconButton,
  Menu,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Attachment } from '../types/models';
import { useNotesStore } from '../store/notesStore';
import { useCategoriesStore } from '../store/categoriesStore';
import { pickImageFromGallery, pickImageFromCamera } from '../services/attachments';

const AUTOSAVE_MS = 1500;

const EMPTY_ATTACHMENTS: Attachment[] = [];

export default function NoteEditScreen() {
  const { t, i18n } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'NoteEdit'>>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const initialNoteId = route.params?.noteId;
  const initialCategoryId = route.params?.categoryId ?? null;

  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const editNote = useNotesStore((s) => s.editNote);
  const setReminder = useNotesStore((s) => s.setReminder);
  const clearReminder = useNotesStore((s) => s.clearReminder);
  const error = useNotesStore((s) => s.error);
  const clearError = useNotesStore((s) => s.clearError);

  // Чек-листы
  const checklists = useNotesStore((s) => s.checklists);
  const loadChecklist = useNotesStore((s) => s.loadChecklist);
  const addChecklistItem = useNotesStore((s) => s.addChecklistItem);
  const toggleChecklistItem = useNotesStore((s) => s.toggleChecklistItem);
  const updateChecklistText = useNotesStore((s) => s.updateChecklistText);
  const removeChecklistItem = useNotesStore((s) => s.removeChecklistItem);

  const categories = useCategoriesStore((s) => s.categories);

  const existing = initialNoteId ? notes.find((n) => n.id === initialNoteId) : undefined;

  const [noteId, setNoteId] = useState<string | null>(initialNoteId ?? null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [content, setContent] = useState(existing?.content ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(
    existing?.categoryId ?? initialCategoryId,
  );
  const [noteType, setNoteType] = useState<'text' | 'checklist'>(existing?.noteType ?? 'text');
  const [catMenuOpen, setCatMenuOpen] = useState(false);

  // ----- Вложения -----
  const allAttachments = useNotesStore((s) => s.attachments);
  const attachments = useMemo(
    () => (noteId ? (allAttachments[noteId] ?? EMPTY_ATTACHMENTS) : EMPTY_ATTACHMENTS),
    [allAttachments, noteId],
  );
  const loadAttachments = useNotesStore((s) => s.loadAttachments);
  const addAttachment = useNotesStore((s) => s.addAttachment);
  const removeAttachment = useNotesStore((s) => s.removeAttachment);

  // ----- Напоминание -----
  const [reminderDate, setReminderDate] = useState<Date | null>(
    existing?.reminderAt ? new Date(existing.reminderAt) : null,
  );
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  // ----- Фото-меню -----
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const isDirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);

  const save = async (): Promise<string | null> => {
    if (isSaving.current) return noteId;
    // Для чек-листа content может быть пустым — сохраняем, если есть пункты
    const hasChecklist = noteId ? (checklists[noteId] ?? []).length > 0 : false;
    if (!title.trim() && !content.trim() && !hasChecklist) return noteId;

    isSaving.current = true;
    try {
      if (noteId) {
        await editNote(noteId, { title, content, categoryId, noteType });
        isDirty.current = false;
        return noteId;
      } else {
        const id = await addNote({
          title,
          content,
          categoryId,
          isPinned: 0,
          noteType,
        });
        setNoteId(id);
        isDirty.current = false;
        return id;
      }
    } catch (e) {
      console.error('[NoteEdit] save:', e);
      return noteId;
    } finally {
      isSaving.current = false;
    }
  };

  const scheduleSave = () => {
    isDirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (isDirty.current) void save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (noteId) void loadAttachments(noteId);
  }, [noteId, loadAttachments]);

  // Загружаем чек-лист при открытии заметки-чек-листа
  useEffect(() => {
    if (noteId && noteType === 'checklist') void loadChecklist(noteId);
  }, [noteId, noteType, loadChecklist]);

  const checklistItems = noteId ? (checklists[noteId] ?? []) : [];

  // ----- Смена режима -----
  const handleChangeMode = async (mode: 'text' | 'checklist') => {
    setNoteType(mode);
    // Если переключаемся на чек-лист и заметка уже сохранена —
    // сохраняем noteType в БД и загружаем пункты
    if (noteId) {
      await editNote(noteId, { noteType: mode });
      if (mode === 'checklist') void loadChecklist(noteId);
    }
  };

  // ----- Напоминание -----
  const handlePickReminder = async (date: Date) => {
    const id = noteId ?? (await save());
    if (!id) {
      console.warn('[NoteEdit] нельзя установить напоминание без сохранения');
      return;
    }
    try {
      await setReminder(id, date);
      setReminderDate(date);
    } catch (e) {
      console.error('[NoteEdit] setReminder:', e);
    }
  };

  const handleClearReminder = async () => {
    if (!noteId) return;
    await clearReminder(noteId);
    setReminderDate(null);
  };

  const openDatePicker = () => {
    setTempDate(reminderDate ?? new Date(Date.now() + 60 * 60 * 1000));
    setPickerMode('date');
  };

  // ----- Фото -----
  const handlePickFromGallery = async () => {
    setPhotoMenuOpen(false);
    try {
      const picked = await pickImageFromGallery();
      if (!picked) return;
      const id = noteId ?? (await save());
      if (!id) return;
      await addAttachment(id, picked);
    } catch (e) {
      console.error('[NoteEdit] gallery:', e);
    }
  };

  const handlePickFromCamera = async () => {
    setPhotoMenuOpen(false);
    try {
      const picked = await pickImageFromCamera();
      if (!picked) return;
      const id = noteId ?? (await save());
      if (!id) return;
      await addAttachment(id, picked);
    } catch (e) {
      console.error('[NoteEdit] camera:', e);
    }
  };

  const currentCategory = categoryId ? categories.find((c) => c.id === categoryId) : undefined;

  const dateLocale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => nav.goBack()} />
        <Appbar.Content title={noteId ? t('notes.editNote') : t('notes.newNote')} />
        <Appbar.Action icon="check" onPress={() => void save().then(() => nav.goBack())} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          mode="flat"
          placeholder={t('notes.titlePlaceholder')}
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            scheduleSave();
          }}
          style={styles.title}
          underlineColor="transparent"
        />

        {/* Переключатель режима */}
        <View style={styles.row}>
          <SegmentedButtons
            value={noteType}
            onValueChange={(v) => void handleChangeMode(v as 'text' | 'checklist')}
            buttons={[
              { value: 'text', label: t('notes.modeText') },
              { value: 'checklist', label: t('notes.modeChecklist') },
            ]}
            style={styles.segmented}
          />
        </View>

        {/* Категория */}
        <View style={styles.row}>
          <Menu
            visible={catMenuOpen}
            onDismiss={() => setCatMenuOpen(false)}
            anchor={
              <Button mode="outlined" icon="folder-outline" onPress={() => setCatMenuOpen(true)}>
                {currentCategory?.name ?? t('notes.noCategory')}
              </Button>
            }>
            <Menu.Item
              title={t('notes.noCategory')}
              onPress={() => {
                setCategoryId(null);
                scheduleSave();
                setCatMenuOpen(false);
              }}
              leadingIcon={categoryId === null ? 'check' : undefined}
            />
            {categories.map((c) => (
              <Menu.Item
                key={c.id}
                title={c.name}
                onPress={() => {
                  setCategoryId(c.id);
                  scheduleSave();
                  setCatMenuOpen(false);
                }}
                leadingIcon={categoryId === c.id ? 'check' : undefined}
              />
            ))}
          </Menu>
        </View>

        {/* Напоминание */}
        <View style={styles.row}>
          <Button mode="outlined" icon="bell-outline" onPress={openDatePicker}>
            {reminderDate
              ? reminderDate.toLocaleString(dateLocale, {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : t('notes.remind')}
          </Button>
          {reminderDate && <IconButton icon="close" size={20} onPress={handleClearReminder} />}
        </View>

        {/* Фото-вложения */}
        <View style={styles.row}>
          <Menu
            visible={photoMenuOpen}
            onDismiss={() => setPhotoMenuOpen(false)}
            anchor={
              <Button mode="outlined" icon="image-plus" onPress={() => setPhotoMenuOpen(true)}>
                {t('notes.photo')}
              </Button>
            }>
            <Menu.Item
              title={t('notes.fromGallery')}
              onPress={handlePickFromGallery}
              leadingIcon="image-multiple"
            />
            <Menu.Item
              title={t('notes.fromCamera')}
              onPress={handlePickFromCamera}
              leadingIcon="camera"
            />
          </Menu>
        </View>

        {/* Миниатюры */}
        {attachments.length > 0 && (
          <View style={styles.attachments}>
            {attachments.map((a) => (
              <View key={a.id} style={styles.thumbWrap}>
                <Image source={{ uri: a.uri }} style={styles.thumb} />
                <IconButton
                  icon="close-circle"
                  size={18}
                  style={styles.thumbRemove}
                  onPress={() => {
                    if (noteId) void removeAttachment(a.id, noteId);
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {/* Тело: текст или чек-лист */}
        {noteType === 'text' ? (
          <TextInput
            mode="flat"
            placeholder={t('notes.contentPlaceholder')}
            value={content}
            onChangeText={(val) => {
              setContent(val);
              scheduleSave();
            }}
            multiline
            style={styles.content}
            underlineColor="transparent"
          />
        ) : (
          <View style={styles.checklist}>
            {checklistItems.length === 0 ? (
              <Text variant="bodySmall" style={styles.checklistEmpty}>
                {t('notes.checklistEmpty')}
              </Text>
            ) : (
              checklistItems.map((item) => (
                <View key={item.id} style={styles.checklistRow}>
                  <Checkbox
                    status={item.isChecked ? 'checked' : 'unchecked'}
                    onPress={() => {
                      if (noteId) {
                        void toggleChecklistItem(noteId, item.id);
                      }
                    }}
                  />
                  <TextInput
                    mode="flat"
                    value={item.text}
                    onChangeText={(val) => {
                      if (noteId) {
                        void updateChecklistText(noteId, item.id, val);
                      }
                    }}
                    style={styles.checklistInput}
                    underlineColor="transparent"
                    placeholder={t('notes.checklistPlaceholder')}
                  />
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => {
                      if (noteId) {
                        void removeChecklistItem(noteId, item.id);
                      }
                    }}
                  />
                </View>
              ))
            )}

            <Button
              mode="text"
              icon="plus"
              onPress={async () => {
                const id = noteId ?? (await save());
                if (id) await addChecklistItem(id, '');
              }}
              style={styles.addChecklistBtn}>
              {t('notes.addChecklistItem')}
            </Button>
          </View>
        )}

        {/* Пикер даты */}
        {pickerMode === 'date' && tempDate && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, date) => {
              if (event.type === 'set' && date) {
                setTempDate(date);
                setPickerMode('time');
              } else {
                setPickerMode(null);
                setTempDate(null);
              }
            }}
          />
        )}

        {/* Пикер времени */}
        {pickerMode === 'time' && tempDate && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            onChange={(event, time) => {
              setPickerMode(null);
              if (event.type === 'set' && time) {
                const finalDate = new Date(tempDate);
                finalDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
                void handlePickReminder(finalDate);
              }
              setTempDate(null);
            }}
          />
        )}

        {noteType === 'text' && (
          <Text variant="labelSmall" style={styles.hint}>
            {t('notes.autosaveHint')}
          </Text>
        )}
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={clearError} duration={3000}>
        {error ? t(error) : ''}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 20, backgroundColor: 'transparent', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  segmented: { flex: 1 },
  content: {
    fontSize: 16,
    minHeight: 240,
    backgroundColor: 'transparent',
    textAlignVertical: 'top',
  },
  hint: { marginTop: 12, opacity: 0.5, textAlign: 'center' },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: 8, backgroundColor: '#eee' },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  checklist: { marginTop: 8 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checklistInput: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  checklistEmpty: {
    textAlign: 'center',
    opacity: 0.5,
    paddingVertical: 16,
  },
  addChecklistBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});
