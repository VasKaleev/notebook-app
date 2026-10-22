// Версия схемы. При изменении структуры — +1 и новая миграция.
export const DATABASE_VERSION = 6;
export const DATABASE_NAME = 'notebook.db';

// SQL для создания таблиц с нуля (первая установка).
// ВАЖНО: PRAGMA идут отдельно в database.ts — до миграций.
export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6750A4',
  createdAt  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  categoryId  TEXT,
  isPinned    INTEGER NOT NULL DEFAULT 0,
  createdAt   INTEGER NOT NULL,
  updatedAt   INTEGER NOT NULL,
  deletedAt   INTEGER DEFAULT NULL,
  reminderAt  INTEGER DEFAULT NULL,
  audioUri    TEXT DEFAULT NULL,
  noteType    TEXT NOT NULL DEFAULT 'text',
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id         TEXT PRIMARY KEY NOT NULL,
  noteId     TEXT NOT NULL,
  uri        TEXT NOT NULL,
  mimeType   TEXT,
  width      INTEGER,
  height     INTEGER,
  createdAt  INTEGER NOT NULL,
  FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id         TEXT PRIMARY KEY NOT NULL,
  noteId     TEXT NOT NULL,
  text       TEXT NOT NULL DEFAULT '',
  isChecked  INTEGER NOT NULL DEFAULT 0,
  position   INTEGER NOT NULL DEFAULT 0,
  createdAt  INTEGER NOT NULL,
  FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_updatedAt    ON notes(updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_notes_categoryId   ON notes(categoryId);
CREATE INDEX IF NOT EXISTS idx_notes_isPinned     ON notes(isPinned);
CREATE INDEX IF NOT EXISTS idx_notes_deletedAt    ON notes(deletedAt);
CREATE INDEX IF NOT EXISTS idx_notes_reminderAt   ON notes(reminderAt);
CREATE INDEX IF NOT EXISTS idx_notes_audioUri     ON notes(audioUri);
CREATE INDEX IF NOT EXISTS idx_attachments_noteId ON attachments(noteId);
CREATE INDEX IF NOT EXISTS idx_checklist_noteId   ON checklist_items(noteId);
CREATE INDEX IF NOT EXISTS idx_checklist_position ON checklist_items(noteId, position);
`;