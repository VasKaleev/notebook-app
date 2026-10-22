import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, DATABASE_VERSION } from './schema';
import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  console.log('[DB] открываю базу...');
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // PRAGMA — до любых запросов и миграций
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const currentVersion = row?.user_version ?? 0;
  console.log('[DB] текущая версия:', currentVersion);

  if (currentVersion < DATABASE_VERSION) {
    console.log('[DB] запускаю миграции...');
    await runMigrations(db, currentVersion);
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    console.log('[DB] миграции завершены');
  } else {
    console.log('[DB] миграции не требуются');
  }

  // ============================================================
  // СТРАХОВКА: проверяем, что критичные структуры существуют.
  // Если миграция не отработала (например, user_version был уже 6,
  // а таблицы checklist_items не было), создаём принудительно.
  // ============================================================
  await ensureDeletedAtColumn(db);
  await ensureReminderAtColumn(db);
  await ensureAttachmentsTable(db);
  await ensureAudioUriColumn(db);
  await ensureNoteTypeColumn(db);
  await ensureChecklistTable(db);

  dbInstance = db;
  console.log('[DB] база готова');
  return db;
}

// ============================================================
// СТРАХОВКИ ДЛЯ КОЛОНОК
// ============================================================

/**
 * Проверяет наличие колонки deletedAt в таблице notes.
 * Если её нет — добавляет через ALTER TABLE и создаёт индекс.
 */
async function ensureDeletedAtColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );

    if (columns.length === 0) return;

    const hasDeletedAt = columns.some((c) => c.name === 'deletedAt');

    if (!hasDeletedAt) {
      console.warn('[DB] deletedAt отсутствует — добавляю принудительно');
      await db.execAsync(
        'ALTER TABLE notes ADD COLUMN deletedAt INTEGER DEFAULT NULL;',
      );
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_notes_deletedAt ON notes(deletedAt);',
    );
  } catch (e) {
    console.error('[DB] Ошибка в ensureDeletedAtColumn:', e);
  }
}

/**
 * Проверяет наличие колонки reminderAt в таблице notes.
 */
async function ensureReminderAtColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );

    if (columns.length === 0) return;

    const hasReminderAt = columns.some((c) => c.name === 'reminderAt');

    if (!hasReminderAt) {
      console.warn('[DB] reminderAt отсутствует — добавляю принудительно');
      await db.execAsync(
        'ALTER TABLE notes ADD COLUMN reminderAt INTEGER DEFAULT NULL;',
      );
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_notes_reminderAt ON notes(reminderAt);',
    );
  } catch (e) {
    console.error('[DB] Ошибка в ensureReminderAtColumn:', e);
  }
}

/**
 * Проверяет наличие колонки audioUri в таблице notes.
 * Добавлена в v5 для голосовых заметок.
 */
async function ensureAudioUriColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );

    if (columns.length === 0) return;

    const hasAudioUri = columns.some((c) => c.name === 'audioUri');

    if (!hasAudioUri) {
      console.warn('[DB] audioUri отсутствует — добавляю принудительно');
      await db.execAsync(
        'ALTER TABLE notes ADD COLUMN audioUri TEXT DEFAULT NULL;',
      );
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_notes_audioUri ON notes(audioUri);',
    );
  } catch (e) {
    console.error('[DB] Ошибка в ensureAudioUriColumn:', e);
  }
}

/**
 * Проверяет наличие колонки noteType в таблице notes.
 * Добавлена в v6 для чек-листов. Значение по умолчанию — 'text'.
 */
async function ensureNoteTypeColumn(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );

    if (columns.length === 0) return;

    const hasNoteType = columns.some((c) => c.name === 'noteType');

    if (!hasNoteType) {
      console.warn('[DB] noteType отсутствует — добавляю принудительно');
      await db.execAsync(
        "ALTER TABLE notes ADD COLUMN noteType TEXT NOT NULL DEFAULT 'text';",
      );
    }
  } catch (e) {
    console.error('[DB] Ошибка в ensureNoteTypeColumn:', e);
  }
}

// ============================================================
// СТРАХОВКИ ДЛЯ ТАБЛИЦ
// ============================================================

/**
 * Проверяет наличие таблицы attachments (v4).
 */
async function ensureAttachmentsTable(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  try {
    // Если таблицы notes ещё нет — ничего не делаем
    const notesTables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'",
    );
    if (notesTables.length === 0) return;

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='attachments'",
    );

    if (tables.length === 0) {
      console.warn('[DB] attachments отсутствует — создаю принудительно');
      await db.execAsync(`
        CREATE TABLE attachments (
          id         TEXT PRIMARY KEY NOT NULL,
          noteId     TEXT NOT NULL,
          uri        TEXT NOT NULL,
          mimeType   TEXT,
          width      INTEGER,
          height     INTEGER,
          createdAt  INTEGER NOT NULL,
          FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
        );
      `);
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_attachments_noteId ON attachments(noteId);',
    );
  } catch (e) {
    console.error('[DB] Ошибка в ensureAttachmentsTable:', e);
  }
}

/**
 * Проверяет наличие таблицы checklist_items (v6).
 */
async function ensureChecklistTable(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  try {
    const notesTables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'",
    );
    if (notesTables.length === 0) return;

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='checklist_items'",
    );

    if (tables.length === 0) {
      console.warn('[DB] checklist_items отсутствует — создаю принудительно');
      await db.execAsync(`
        CREATE TABLE checklist_items (
          id         TEXT PRIMARY KEY NOT NULL,
          noteId     TEXT NOT NULL,
          text       TEXT NOT NULL DEFAULT '',
          isChecked  INTEGER NOT NULL DEFAULT 0,
          position   INTEGER NOT NULL DEFAULT 0,
          createdAt  INTEGER NOT NULL,
          FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
        );
      `);
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_checklist_noteId ON checklist_items(noteId);',
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_checklist_position ON checklist_items(noteId, position);',
    );
  } catch (e) {
    console.error('[DB] Ошибка в ensureChecklistTable:', e);
  }
}

// ============================================================
// УТИЛИТЫ
// ============================================================

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

// Простой UUID v4 без нативных зависимостей
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}