import { getDatabase, generateId } from './database';
import { enqueue } from './queue';
import type { ChecklistItem, CreateChecklistItemDTO } from '../types/models';

export async function getChecklistByNote(
  noteId: string,
): Promise<ChecklistItem[]> {
  return enqueue(async () => {
    const db = await getDatabase();
    return db.getAllAsync<ChecklistItem>(
      'SELECT * FROM checklist_items WHERE noteId = ? ORDER BY position ASC',
      noteId,
    );
  });
}

export async function createChecklistItem(
  dto: CreateChecklistItemDTO,
): Promise<string> {
  return enqueue(async () => {
    const db = await getDatabase();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO checklist_items (id, noteId, text, isChecked, position, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id, dto.noteId, dto.text, dto.isChecked ?? 0, dto.position, Date.now(),
    );
    return id;
  });
}

export async function updateChecklistItem(
  id: string,
  dto: Partial<Pick<ChecklistItem, 'text' | 'isChecked' | 'position'>>,
): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.text !== undefined) { fields.push('text = ?'); params.push(dto.text); }
    if (dto.isChecked !== undefined) { fields.push('isChecked = ?'); params.push(dto.isChecked); }
    if (dto.position !== undefined) { fields.push('position = ?'); params.push(dto.position); }
    if (fields.length === 0) return;

    params.push(id);
    await db.runAsync(
      `UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`,
      ...params,
    );
  });
}

export async function deleteChecklistItem(id: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM checklist_items WHERE id = ?', id);
  });
}

export async function deleteChecklistByNote(noteId: string): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM checklist_items WHERE noteId = ?', noteId);
  });
}

/** Прогресс для карточки: { checked, total } */
export async function getChecklistProgress(
  noteId: string,
): Promise<{ checked: number; total: number }> {
  return enqueue(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number; checked: number }>(
      `SELECT COUNT(*) as total, COALESCE(SUM(isChecked), 0) as checked
       FROM checklist_items WHERE noteId = ?`,
      noteId,
    );
    return { checked: row?.checked ?? 0, total: row?.total ?? 0 };
  });
}