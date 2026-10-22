// Все даты — UNIX timestamp в миллисекундах (number).
// SQLite не поддерживает boolean → используем 0 | 1.

export interface Note {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  isPinned: 0 | 1;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;      // null = активная, число = в корзине
  reminderAt: number | null;     // null = без напоминания, число = timestamp
  audioUri: string | null;       // null = без аудио, строка = путь к файлу
  noteType: 'text' | 'checklist'; // режим заметки
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  noteId: string;
  uri: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  noteId: string;
  text: string;
  isChecked: 0 | 1;
  position: number;
  createdAt: number;
}

// DTO для создания заметки — пользовательские поля.
// deletedAt, reminderAt, audioUri ставятся в NULL автоматически в createNote.
// noteType — обязателен, пользователь выбирает «Текст» или «Чек-лист».
export type CreateNoteDTO = Pick<
  Note,
  'title' | 'content' | 'categoryId' | 'isPinned' | 'noteType'
>;

// DTO для обновления — все поля, кроме id, createdAt.
// Включает deletedAt, reminderAt, audioUri, noteType — их можно менять.
export type UpdateNoteDTO = Partial<Omit<Note, 'id' | 'createdAt'>>;

export type CreateCategoryDTO = Omit<Category, 'id' | 'createdAt'>;
export type UpdateCategoryDTO = Partial<Omit<Category, 'id' | 'createdAt'>>;

export type CreateAttachmentDTO = Omit<Attachment, 'id' | 'createdAt'>;

export type CreateChecklistItemDTO = Omit<ChecklistItem, 'id' | 'createdAt'>;