import { create } from 'zustand';
import * as NotesRepo from '../db/notes.repo';
import * as AttachmentsRepo from '../db/attachments.repo';
import * as ChecklistRepo from '../db/checklist.repo';
import { useCategoriesStore } from './categoriesStore';
import { scheduleNoteReminder } from '../services/notifications';
import type {
  Note,
  CreateNoteDTO,
  UpdateNoteDTO,
  Attachment,
  ChecklistItem,
} from '../types/models';

export type SortBy = 'updatedAt' | 'createdAt' | 'title';

interface PickedImage {
  uri: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
}

interface NotesState {
  notes: Note[];
  trashNotes: Note[];
  attachments: Record<string, Attachment[]>;
  checklists: Record<string, ChecklistItem[]>;
  isLoading: boolean;
  /**
   * Ключ локализации ошибки (например, 'errors.loadNotes').
   * В UI рендерим через t(error) — так перевод берётся в момент отображения.
   */
  error: string | null;

  // Фильтры
  search: string;
  categoryId: string | null;
  sortBy: SortBy;

  // Действия
  loadNotes: () => Promise<void>;
  setSearch: (q: string) => void;
  setCategoryFilter: (id: string | null) => void;
  setSortBy: (s: SortBy) => void;
  applyDefaultSort: (s: SortBy) => void;
  addNote: (dto: CreateNoteDTO) => Promise<string>;
  editNote: (id: string, dto: UpdateNoteDTO) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setReminder: (id: string, date: Date) => Promise<void>;
  clearReminder: (id: string) => Promise<void>;
  clearError: () => void;

  // Вложения
  loadAttachments: (noteId: string) => Promise<void>;
  addAttachment: (noteId: string, picked: PickedImage) => Promise<void>;
  removeAttachment: (id: string, noteId: string) => Promise<void>;

  // Чек-листы
  loadChecklist: (noteId: string) => Promise<void>;
  addChecklistItem: (noteId: string, text: string) => Promise<void>;
  toggleChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  updateChecklistText: (
    noteId: string,
    itemId: string,
    text: string,
  ) => Promise<void>;
  removeChecklistItem: (noteId: string, itemId: string) => Promise<void>;

  // Корзина
  loadTrash: () => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

function sortNotes(notes: Note[], sortBy: SortBy): Note[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title, 'ru');
    }
    return (b[sortBy] as number) - (a[sortBy] as number);
  });
}

function refreshCategoryCounts(): void {
  void useCategoriesStore.getState().loadCategories();
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  trashNotes: [],
  attachments: {},
  checklists: {},
  isLoading: false,
  error: null,

  search: '',
  categoryId: null,
  sortBy: 'updatedAt',

  loadNotes: async () => {
    console.log('[notesStore] loadNotes START');
    set({ isLoading: true, error: null });
    try {
      const { search, categoryId, sortBy } = get();
      console.log('[notesStore] loadNotes: вызываю getAllNotes', {
        search,
        categoryId,
        sortBy,
      });
      const notes = await NotesRepo.getAllNotes({ search, categoryId, sortBy });
      console.log('[notesStore] loadNotes DONE, notes.length =', notes.length);
      set({ notes, isLoading: false });
    } catch (e) {
      console.error('[notesStore] loadNotes ERROR:', e);
      set({ error: 'errors.loadNotes', isLoading: false });
    }
  },

  setSearch: (q) => {
    set({ search: q });
    void get().loadNotes();
  },

  setCategoryFilter: (id) => {
    set({ categoryId: id });
    void get().loadNotes();
  },

  setSortBy: (s) => {
    set({ sortBy: s, notes: sortNotes(get().notes, s) });
  },

  applyDefaultSort: (s) => {
    set({ sortBy: s, notes: sortNotes(get().notes, s) });
  },

  addNote: async (dto) => {
    try {
      const id = await NotesRepo.createNote(dto);
      const created = await NotesRepo.getNoteById(id);
      if (created) {
        const { sortBy, notes } = get();
        set({ notes: sortNotes([created, ...notes], sortBy) });
      }
      refreshCategoryCounts();
      return id;
    } catch (e) {
      console.error('[notesStore] addNote:', e);
      set({ error: 'errors.createNote' });
      throw e;
    }
  },

  editNote: async (id, dto) => {
    const prev = get().notes;
    const now = Date.now();
    const oldCategoryId = prev.find((n) => n.id === id)?.categoryId;

    set({
      notes: prev.map((n) =>
        n.id === id ? { ...n, ...dto, updatedAt: now } : n,
      ),
    });

    try {
      await NotesRepo.updateNote(id, dto);
      const { sortBy } = get();
      set({ notes: sortNotes(get().notes, sortBy) });

      if (dto.categoryId !== undefined && dto.categoryId !== oldCategoryId) {
        refreshCategoryCounts();
      }
    } catch (e) {
      console.error('[notesStore] editNote:', e);
      set({ notes: prev, error: 'errors.saveNote' });
    }
  },

  removeNote: async (id) => {
    const prev = get().notes;
    const removed = prev.find((n) => n.id === id);

    set({ notes: prev.filter((n) => n.id !== id) });

    try {
      await NotesRepo.deleteNote(id);
      if (removed) {
        set({
          trashNotes: [
            { ...removed, deletedAt: Date.now() },
            ...get().trashNotes,
          ],
        });
      }
      refreshCategoryCounts();
    } catch (e) {
      console.error('[notesStore] removeNote:', e);
      set({ notes: prev, error: 'errors.deleteNote' });
    }
  },

  togglePin: async (id) => {
    const prev = get().notes;

    const updated: Note[] = prev.map((n) =>
      n.id === id ? { ...n, isPinned: (n.isPinned ? 0 : 1) as 0 | 1 } : n,
    );

    const { sortBy } = get();
    set({ notes: sortNotes(updated, sortBy) });

    try {
      await NotesRepo.togglePin(id);
    } catch (e) {
      console.error('[notesStore] togglePin:', e);
      set({ notes: prev, error: 'errors.togglePin' });
    }
  },

  // ============================================================
  // НАПОМИНАНИЯ
  // ============================================================

  setReminder: async (id, date) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) {
      console.warn('[notesStore] setReminder: заметка не найдена', id);
      return;
    }

    try {
      const notificationId = await scheduleNoteReminder(
        id,
        note.title || 'Note',
        date,
      );

      if (notificationId === null) {
        console.warn(
          '[notesStore] напоминание не запланировано (Expo Go). ' +
            'Дата сохранена, но уведомление не придёт.',
        );
      } else {
        console.log('[notesStore] reminder scheduled:', notificationId);
      }

      await NotesRepo.updateNote(id, { reminderAt: date.getTime() });

      set({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, reminderAt: date.getTime() } : n,
        ),
      });
    } catch (e) {
      console.error('[notesStore] setReminder:', e);
      set({ error: 'errors.setReminder' });
      throw e;
    }
  },

  clearReminder: async (id) => {
    try {
      await NotesRepo.updateNote(id, { reminderAt: null });
      set({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, reminderAt: null } : n,
        ),
      });
      console.log('[notesStore] reminder cleared');
    } catch (e) {
      console.error('[notesStore] clearReminder:', e);
      set({ error: 'errors.clearReminder' });
    }
  },

  // ============================================================
  // ВЛОЖЕНИЯ
  // ============================================================

  loadAttachments: async (noteId) => {
    try {
      const list = await AttachmentsRepo.getAttachmentsByNote(noteId);
      set({ attachments: { ...get().attachments, [noteId]: list } });
    } catch (e) {
      console.error('[notesStore] loadAttachments:', e);
    }
  },

  addAttachment: async (noteId, picked) => {
    try {
      await AttachmentsRepo.createAttachment({
        noteId,
        uri: picked.uri,
        mimeType: picked.mimeType,
        width: picked.width,
        height: picked.height,
      });
      const list = await AttachmentsRepo.getAttachmentsByNote(noteId);
      set({ attachments: { ...get().attachments, [noteId]: list } });
      console.log('[notesStore] attachment added, total:', list.length);
    } catch (e) {
      console.error('[notesStore] addAttachment:', e);
      set({ error: 'errors.addPhoto' });
      throw e;
    }
  },

  removeAttachment: async (id, noteId) => {
    try {
      await AttachmentsRepo.deleteAttachment(id);
      set({
        attachments: {
          ...get().attachments,
          [noteId]: (get().attachments[noteId] ?? []).filter(
            (a) => a.id !== id,
          ),
        },
      });
    } catch (e) {
      console.error('[notesStore] removeAttachment:', e);
      set({ error: 'errors.removePhoto' });
    }
  },

  // ============================================================
  // ЧЕК-ЛИСТЫ
  // ============================================================

  loadChecklist: async (noteId) => {
    try {
      const items = await ChecklistRepo.getChecklistByNote(noteId);
      set({ checklists: { ...get().checklists, [noteId]: items } });
    } catch (e) {
      console.error('[notesStore] loadChecklist:', e);
    }
  },

  addChecklistItem: async (noteId, text) => {
    try {
      const current = get().checklists[noteId] ?? [];
      await ChecklistRepo.createChecklistItem({
        noteId,
        text,
        isChecked: 0,
        position: current.length,
      });
      const items = await ChecklistRepo.getChecklistByNote(noteId);
      set({ checklists: { ...get().checklists, [noteId]: items } });
      console.log('[notesStore] checklist item added, total:', items.length);
    } catch (e) {
      console.error('[notesStore] addChecklistItem:', e);
      set({ error: 'errors.saveNote' });
    }
  },

  toggleChecklistItem: async (noteId, itemId) => {
    try {
      const current = get().checklists[noteId] ?? [];
      const item = current.find((i) => i.id === itemId);
      if (!item) return;

      const newChecked: 0 | 1 = item.isChecked ? 0 : 1;

      // Оптимистичное обновление
      set({
        checklists: {
          ...get().checklists,
          [noteId]: current.map((i) =>
            i.id === itemId ? { ...i, isChecked: newChecked } : i,
          ),
        },
      });

      await ChecklistRepo.updateChecklistItem(itemId, {
        isChecked: newChecked,
      });
    } catch (e) {
      console.error('[notesStore] toggleChecklistItem:', e);
      set({ error: 'errors.saveNote' });
    }
  },

  updateChecklistText: async (noteId, itemId, text) => {
    try {
      // Оптимистичное обновление
      set({
        checklists: {
          ...get().checklists,
          [noteId]: (get().checklists[noteId] ?? []).map((i) =>
            i.id === itemId ? { ...i, text } : i,
          ),
        },
      });

      await ChecklistRepo.updateChecklistItem(itemId, { text });
    } catch (e) {
      console.error('[notesStore] updateChecklistText:', e);
      set({ error: 'errors.saveNote' });
    }
  },

  removeChecklistItem: async (noteId, itemId) => {
    try {
      await ChecklistRepo.deleteChecklistItem(itemId);
      set({
        checklists: {
          ...get().checklists,
          [noteId]: (get().checklists[noteId] ?? []).filter(
            (i) => i.id !== itemId,
          ),
        },
      });
    } catch (e) {
      console.error('[notesStore] removeChecklistItem:', e);
      set({ error: 'errors.deleteNote' });
    }
  },

  clearError: () => set({ error: null }),

  // ============================================================
  // КОРЗИНА
  // ============================================================

  loadTrash: async () => {
    try {
      const trashNotes = await NotesRepo.getTrashNotes();
      set({ trashNotes });
    } catch (e) {
      console.error('[notesStore] loadTrash:', e);
      set({ error: 'errors.loadTrash' });
    }
  },

  restoreNote: async (id) => {
    try {
      await NotesRepo.restoreNote(id);
      set({ trashNotes: get().trashNotes.filter((n) => n.id !== id) });
      await get().loadNotes();
      refreshCategoryCounts();
    } catch (e) {
      console.error('[notesStore] restoreNote:', e);
      set({ error: 'errors.restoreNote' });
    }
  },

  permanentDelete: async (id) => {
    try {
      await NotesRepo.permanentDelete(id);
      set({ trashNotes: get().trashNotes.filter((n) => n.id !== id) });
    } catch (e) {
      console.error('[notesStore] permanentDelete:', e);
      set({ error: 'errors.deleteForever' });
    }
  },

  emptyTrash: async () => {
    try {
      await NotesRepo.emptyTrash();
      set({ trashNotes: [] });
    } catch (e) {
      console.error('[notesStore] emptyTrash:', e);
      set({ error: 'errors.clearTrash' });
    }
  },
}));