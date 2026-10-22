import { getDatabase, generateId } from './database';
import { enqueue } from './queue';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../types/models';

/** Все категории (по алфавиту, регистронезависимо) */
export async function getAllCategories(): Promise<Category[]> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC');
  });
}

/** Одна категория по id */
export async function getCategoryById(id: string): Promise<Category | null> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', id);
  });
}

/**
 * Количество активных заметок в каждой категории.
 * Возвращает Map<categoryId, count>. Заметки без категории не считаются.
 */
export async function getCategoryCounts(): Promise<Map<string, number>> {
  return enqueue(async () => {
    const db = await getDatabase();

    // Диагностика: смотрим, что вообще есть в notes
    const total = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM notes');
    const withCategory = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM notes WHERE categoryId IS NOT NULL',
    );
    const active = await db.getFirstAsync<{ c: number }>(
      'SELECT COUNT(*) as c FROM notes WHERE deletedAt IS NULL',
    );

    console.log('[categories.repo] диагностика:', {
      totalNotes: total?.c ?? 0,
      withCategory: withCategory?.c ?? 0,
      activeNotes: active?.c ?? 0,
    });

    const rows = await db.getAllAsync<{ categoryId: string; c: number }>(
      `SELECT categoryId, COUNT(*) as c
       FROM notes
       WHERE deletedAt IS NULL AND categoryId IS NOT NULL
       GROUP BY categoryId`,
    );

    console.log('[categories.repo] getCategoryCounts rows:', rows);

    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.categoryId, r.c));
    return map;
  });
}

/** Создать категорию, возвращает id */
export async function createCategory(dto: CreateCategoryDTO): Promise<string> {
  return enqueue(async () => {
    const db = await getDatabase();
    const id = generateId();
    await db.runAsync(
      'INSERT INTO categories (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
      id,
      dto.name,
      dto.color ?? '#6750A4',
      Date.now(),
    );
    return id;
  });
}

/** Обновить категорию */
export async function updateCategory(id: string, dto: UpdateCategoryDTO): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      params.push(dto.name);
    }
    if (dto.color !== undefined) {
      fields.push('color = ?');
      params.push(dto.color);
    }
    if (fields.length === 0) return;

    params.push(id);
    await db.runAsync(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, ...params);
  });
}

/** Удалить категорию (заметки станут «без категории» через ON DELETE SET NULL) */
export async function deleteCategory(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}
