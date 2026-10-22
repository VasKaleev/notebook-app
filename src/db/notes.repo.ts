import { getDatabase, generateId } from './database';
import { enqueue } from './queue';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '../types/models';

const TRASH_TTL_DAYS = 30;

// ---------- ЧТЕНИЕ ----------

export async function getAllNotes(options?: {
  search?: string;
  categoryId?: string | null;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
}): Promise<Note[]> {
  return enqueue(async () => {
    const db = await getDatabase();
    const { search, categoryId, sortBy = 'updatedAt' } = options ?? {};

    const where: string[] = ['deletedAt IS NULL'];
    const params: (string | number)[] = [];

    if (categoryId !== undefined && categoryId !== null) {
      where.push('categoryId = ?');
      params.push(categoryId);
    }

    if (search && search.trim()) {
      const words = search
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2);
      words.forEach((word) => {
        where.push('(title LIKE ? OR content LIKE ?)');
        const q = `%${word}%`;
        params.push(q, q);
      });
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const orderSql = `ORDER BY isPinned DESC, ${sortBy} DESC`;

    return db.getAllAsync<Note>(`SELECT * FROM notes ${whereSql} ${orderSql}`, ...params);
  });
}

export async function getNoteById(id: string): Promise<Note | null> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getFirstAsync<Note>('SELECT * FROM notes WHERE id = ?', id);
  });
}

// ---------- КОРЗИНА ----------

export async function getTrashNotes(): Promise<Note[]> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Note>(
      `SELECT * FROM notes
       WHERE deletedAt IS NOT NULL
       ORDER BY deletedAt DESC`,
    );
  });
}

export async function restoreNote(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('UPDATE notes SET deletedAt = NULL WHERE id = ?', id);
  });
}

export async function permanentDelete(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes WHERE id = ?', id);
  });
}

export async function emptyTrash(): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes WHERE deletedAt IS NOT NULL');
  });
}

export async function purgeOldTrash(): Promise<number> {
  return enqueue(async () => {
    const db = await getDatabase();
    const cutoff = Date.now() - TRASH_TTL_DAYS * 24 * 60 * 60 * 1000;
    const result = await db.runAsync(
      'DELETE FROM notes WHERE deletedAt IS NOT NULL AND deletedAt < ?',
      cutoff,
    );
    return result.changes ?? 0;
  });
}

// ---------- СОЗДАНИЕ / ОБНОВЛЕНИЕ ----------

export async function createNote(dto: CreateNoteDTO): Promise<string> {
  return enqueue(async () => {
    const db = await getDatabase();
    const id = generateId();
    const now = Date.now();

    let safeCategoryId: string | null = dto.categoryId ?? null;
    if (safeCategoryId) {
      const exists = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) as c FROM categories WHERE id = ?',
        safeCategoryId,
      );
      if (!exists || exists.c === 0) safeCategoryId = null;
    }

    await db.runAsync(
      `INSERT INTO notes (id, title, content, categoryId, isPinned, createdAt, updatedAt, deletedAt, reminderAt, audioUri, noteType)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?)`,
      id,
      dto.title ?? '',
      dto.content ?? '',
      safeCategoryId,
      dto.isPinned ?? 0,
      now,
      now,
      dto.noteType ?? 'text',
    );
    return id;
  });
}

export async function updateNote(id: string, dto: UpdateNoteDTO): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (dto.title !== undefined) {
      fields.push('title = ?');
      params.push(dto.title);
    }
    if (dto.content !== undefined) {
      fields.push('content = ?');
      params.push(dto.content);
    }
    if (dto.categoryId !== undefined) {
      fields.push('categoryId = ?');
      params.push(dto.categoryId);
    }
    if (dto.isPinned !== undefined) {
      fields.push('isPinned = ?');
      params.push(dto.isPinned);
    }
    // Обновление reminderAt (для setReminder / clearReminder)
    if (dto.reminderAt !== undefined) {
      fields.push('reminderAt = ?');
      params.push(dto.reminderAt);
    }
    // Обновление deletedAt (для soft delete / restore)
    if (dto.deletedAt !== undefined) {
      fields.push('deletedAt = ?');
      params.push(dto.deletedAt);
    }
    // Обновление audioUri (голосовые заметки)
    if (dto.audioUri !== undefined) {
      fields.push('audioUri = ?');
      params.push(dto.audioUri);
    }
    // Обновление noteType (переключение «Текст / Чек-лист»)
    if (dto.noteType !== undefined) {
      fields.push('noteType = ?');
      params.push(dto.noteType);
    }

    if (fields.length === 0) return;

    fields.push('updatedAt = ?');
    params.push(Date.now());
    params.push(id);

    await db.runAsync(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, ...params);
  });
}

// ---------- УДАЛЕНИЕ (soft delete) ----------

/** Поместить заметку в корзину (soft delete) */
export async function deleteNote(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('UPDATE notes SET deletedAt = ? WHERE id = ?', Date.now(), id);
  });
}

export async function togglePin(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE notes SET isPinned = CASE WHEN isPinned = 1 THEN 0 ELSE 1 END WHERE id = ?',
      id,
    );
  });
}

export async function getNotesCount(categoryId?: string | null): Promise<number> {
  return enqueue(async () => {
    const db = await getDatabase();
    const where = categoryId ? 'deletedAt IS NULL AND categoryId = ?' : 'deletedAt IS NULL';
    const params = categoryId ? [categoryId] : [];
    const row = await db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM notes WHERE ${where}`,
      ...params,
    );
    return row?.c ?? 0;
  });
}
