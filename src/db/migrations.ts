import type { SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

/**
 * Каждая миграция повышает версию БД на 1.
 * migrations[0]: v0 → v1 (первичная схема)
 * migrations[1]: v1 → v2 (мусорная корзина)
 * migrations[2]: v2 → v3 (напоминания)
 * migrations[3]: v3 → v4 (фото-вложения)
 * migrations[4]: v4 → v5 (голосовые заметки)
 * migrations[5]: v5 → v6 (чек-листы)
 *
 * ВАЖНО: миграции должны быть идемпотентными — повторный запуск
 * не должен падать с «duplicate column» или «no such table».
 */
export const migrations: ((db: SQLiteDatabase) => Promise<void>)[] = [
  // v0 → v1: первичная схема
  async (db) => {
    await db.execAsync(CREATE_TABLES_SQL);
  },

  // v1 → v2: мусорная корзина
  async (db) => {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );
    const hasDeletedAt = columns.some((c) => c.name === 'deletedAt');

    if (!hasDeletedAt) {
      console.log('[DB] Добавляю колонку deletedAt...');
      await db.execAsync(
        'ALTER TABLE notes ADD COLUMN deletedAt INTEGER DEFAULT NULL;',
      );
    } else {
      console.log('[DB] Колонка deletedAt уже существует — пропускаю ALTER');
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_notes_deletedAt ON notes(deletedAt);',
    );
  },

  // v2 → v3: напоминания
  async (db) => {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );
    const hasReminderAt = columns.some((c) => c.name === 'reminderAt');

    if (!hasReminderAt) {
      console.log('[DB] Добавляю колонку reminderAt...');
      await db.execAsync(
        'ALTER TABLE notes ADD COLUMN reminderAt INTEGER DEFAULT NULL;',
      );
    } else {
      console.log('[DB] Колонка reminderAt уже существует — пропускаю ALTER');
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_notes_reminderAt ON notes(reminderAt);',
    );
  },

  // v3 → v4: фото-вложения
  async (db) => {
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='attachments'",
    );

    if (tables.length === 0) {
      console.log('[DB] Создаю таблицу attachments...');
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
    } else {
      console.log('[DB] Таблица attachments уже существует — пропускаю CREATE');
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_attachments_noteId ON attachments(noteId);',
    );
  },

  // v4 → v5: голосовые заметки
  async (db) => {
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );
    const hasAudioUri = columns.some((c) => c.name === 'audioUri');

    if (!hasAudioUri) {
      console.log('[DB] Добавляю колонку audioUri...');
      await db.execAsync(
        'ALTER TABLE notes ADD COLUMN audioUri TEXT DEFAULT NULL;',
      );
    } else {
      console.log('[DB] Колонка audioUri уже существует — пропускаю ALTER');
    }

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_notes_audioUri ON notes(audioUri);',
    );
  },

  // v5 → v6: чек-листы
  async (db) => {
    // 1. Таблица checklist_items
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='checklist_items'",
    );

    if (tables.length === 0) {
      console.log('[DB] Создаю таблицу checklist_items...');
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
    } else {
      console.log('[DB] Таблица checklist_items уже существует — пропускаю CREATE');
    }

    // 2. Поле noteType в notes
    const columns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(notes)',
    );
    const hasNoteType = columns.some((c) => c.name === 'noteType');

    if (!hasNoteType) {
      console.log('[DB] Добавляю колонку noteType...');
      await db.execAsync(
        "ALTER TABLE notes ADD COLUMN noteType TEXT NOT NULL DEFAULT 'text';",
      );
    } else {
      console.log('[DB] Колонка noteType уже существует — пропускаю ALTER');
    }

    // 3. Индексы
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_checklist_noteId ON checklist_items(noteId);',
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_checklist_position ON checklist_items(noteId, position);',
    );
  },
];

/**
 * Применяет миграции по порядку, начиная с currentVersion.
 * Логирует, какая миграция выполняется, и оборачивает ошибку
 * в понятное сообщение с номером версии.
 */
export async function runMigrations(
  db: SQLiteDatabase,
  currentVersion: number,
): Promise<void> {
  for (let i = currentVersion; i < migrations.length; i++) {
    const version = i + 1;
    console.log(`[DB] Миграция ${version}/${migrations.length}...`);
    try {
      await migrations[i](db);
      console.log(`[DB] Миграция ${version} завершена`);
    } catch (e) {
      console.error(`[DB] Ошибка в миграции ${version}:`, e);
      throw new Error(
        `Не удалось применить миграцию ${version}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }
}