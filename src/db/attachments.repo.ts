import { Directory, File, Paths } from 'expo-file-system';
import { getDatabase, generateId } from './database';
import { enqueue } from './queue';
import type { Attachment, CreateAttachmentDTO } from '../types/models';

const ATTACHMENTS_DIR = 'attachments';

// ============================================================
// ЧТЕНИЕ
// ============================================================

/** Все вложения заметки (по дате создания — старые сверху) */
export async function getAttachmentsByNote(noteId: string): Promise<Attachment[]> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Attachment>(
      'SELECT * FROM attachments WHERE noteId = ? ORDER BY createdAt ASC',
      noteId,
    );
  });
}

/** Одно вложение по id */
export async function getAttachmentById(id: string): Promise<Attachment | null> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getFirstAsync<Attachment>('SELECT * FROM attachments WHERE id = ?', id);
  });
}

/** Количество вложений у заметки */
export async function getAttachmentsCount(noteId: string): Promise<number> {
  return enqueue(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM attachments WHERE noteId = ?',
      noteId,
    );
    return row?.c ?? 0;
  });
}

// ============================================================
// СОЗДАНИЕ
// ============================================================

/**
 * Создать вложение. Файл уже должен быть скопирован в приватную папку
 * (это делает services/attachments.ts).
 */
export async function createAttachment(dto: CreateAttachmentDTO): Promise<string> {
  return enqueue(async () => {
    const db = await getDatabase();
    const id = generateId();

    await db.runAsync(
      `INSERT INTO attachments (id, noteId, uri, mimeType, width, height, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      dto.noteId,
      dto.uri,
      dto.mimeType ?? null,
      dto.width ?? null,
      dto.height ?? null,
      Date.now(),
    );

    return id;
  });
}

// ============================================================
// УДАЛЕНИЕ
// ============================================================

/**
 * Удалить вложение: сначала из БД, потом файл с диска.
 * Если файл удалить не удалось — не падаем, только логируем
 * (его подчистит cleanupOrphanFiles при следующем старте).
 */
export async function deleteAttachment(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();

    const row = await db.getFirstAsync<{ uri: string }>(
      'SELECT uri FROM attachments WHERE id = ?',
      id,
    );

    await db.runAsync('DELETE FROM attachments WHERE id = ?', id);

    if (row?.uri) {
      try {
        const file = new File(row.uri);
        if (file.exists) file.delete();
      } catch (e) {
        console.warn('[attachments.repo] не удалось удалить файл:', e);
      }
    }
  });
}

/** Удалить все вложения заметки (из БД и с диска) */
export async function deleteAttachmentsByNote(noteId: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();

    const rows = await db.getAllAsync<{ uri: string }>(
      'SELECT uri FROM attachments WHERE noteId = ?',
      noteId,
    );

    await db.runAsync('DELETE FROM attachments WHERE noteId = ?', noteId);

    for (const row of rows) {
      try {
        const file = new File(row.uri);
        if (file.exists) file.delete();
      } catch (e) {
        console.warn('[attachments.repo] не удалось удалить файл:', e);
      }
    }
  });
}

// ============================================================
// ОЧИСТКА «СИРОТСКИХ» ФАЙЛОВ
// ============================================================

/**
 * Удалить файлы в папке attachments, на которые нет ссылок в БД.
 * Вызывается при старте приложения, чтобы не копить мусор
 * (например, после удаления заметки через CASCADE).
 */
export async function cleanupOrphanFiles(): Promise<number> {
  return enqueue(async () => {
    const db = await getDatabase();

    // Все URI, на которые есть ссылки в БД
    const rows = await db.getAllAsync<{ uri: string }>('SELECT uri FROM attachments');
    const validUris = new Set(rows.map((r) => r.uri));

    // Проверяем папку attachments
    const dir = new Directory(Paths.document, ATTACHMENTS_DIR);
    if (!dir.exists) return 0;

    let removed = 0;
    const entries = dir.list();

    for (const entry of entries) {
      if (entry instanceof File) {
        if (!validUris.has(entry.uri)) {
          try {
            entry.delete();
            removed++;
          } catch (e) {
            console.warn('[attachments.repo] cleanup:', e);
          }
        }
      }
    }

    if (removed > 0) {
      console.log(`[attachments.repo] удалено сиротских файлов: ${removed}`);
    }
    return removed;
  });
}
