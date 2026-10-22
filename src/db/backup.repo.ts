import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from './database';
import { enqueue } from './queue';
import type { Note, Category } from '../types/models';
import JSZip from 'jszip';

/**
 * Структура файла резервной копии.
 * version — на будущее, если формат изменится.
 */
interface BackupData {
  version: number;
  exportedAt: number;
  appName: string;
  categories: Category[];
  notes: Note[];
}

const BACKUP_VERSION = 1;
const APP_NAME = 'Мои заметки';

// ============================================================
// ЭКСПОРТ
// ============================================================

/**
 * Экспорт всех данных в JSON.
 * Открывает системный диалог «Поделиться» — пользователь сохраняет файл
 * в Google Drive, отправляет себе в Telegram или на почту.
 */
export async function exportBackupJson(): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();

    const categories = await db.getAllAsync<Category>(
      'SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC',
    );
    const notes = await db.getAllAsync<Note>('SELECT * FROM notes ORDER BY updatedAt DESC');

    const data: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      appName: APP_NAME,
      categories,
      notes,
    };

    const date = new Date().toISOString().slice(0, 10);
    const filename = `notebook-backup-${date}.json`;

    // Новый API: File + Paths.cache. Кодировка — UTF-8 по умолчанию.
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(JSON.stringify(data, null, 2));

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing недоступен на этом устройстве');
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Сохранить резервную копию',
      UTI: 'public.json',
    });
  });
}

/**
 * Экспорт заметок в CSV для Excel / Google Sheets.
 * BOM (\uFEFF) в начале — чтобы Excel правильно открыл кириллицу.
 */
export async function exportBackupCsv(): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();

    const rows = await db.getAllAsync<Note & { categoryName: string | null }>(
      `SELECT n.*, c.name AS categoryName
       FROM notes n
       LEFT JOIN categories c ON c.id = n.categoryId
       ORDER BY n.updatedAt DESC`,
    );

    // Экранирование: кавычки удваиваются, поле оборачивается в кавычки
    const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;

    const header = [
      'id',
      'title',
      'content',
      'category',
      'isPinned',
      'createdAt',
      'updatedAt',
    ].join(',');

    const lines = rows.map((n) =>
      [
        esc(n.id),
        esc(n.title),
        esc(n.content),
        esc(n.categoryName),
        n.isPinned,
        new Date(n.createdAt).toISOString(),
        new Date(n.updatedAt).toISOString(),
      ].join(','),
    );

    // BOM — обязателен для корректной кириллицы в Excel
    const csv = '\uFEFF' + [header, ...lines].join('\n');

    const date = new Date().toISOString().slice(0, 10);
    const filename = `notebook-${date}.csv`;

    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(csv);

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing недоступен на этом устройстве');
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Сохранить CSV',
      UTI: 'public.comma-separated-values-text',
    });
  });
}

// ============================================================
// ИМПОРТ
// ============================================================

/**
 * Импорт из JSON-файла, выбранного пользователем.
 * merge = true  → добавляет к существующим (пропускает дубликаты по id)
 * merge = false → полностью заменяет всё содержимое
 */
export async function pickAndImportJson(merge = true): Promise<{
  notesAdded: number;
  categoriesAdded: number;
  notesSkipped: number;
} | null> {
  // 1. Выбор файла
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) {
    return null; // пользователь отменил
  }

  const uri = result.assets[0].uri;

  // 2. Чтение через новый API — File.text() возвращает строку в UTF-8
  const file = new File(uri);
  const content = await file.text();

  let data: BackupData;
  try {
    data = JSON.parse(content) as BackupData;
  } catch {
    throw new Error('Файл повреждён или не является JSON');
  }

  // 3. Валидация структуры
  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray(data.notes) ||
    !Array.isArray(data.categories)
  ) {
    throw new Error('Неверный формат файла резервной копии');
  }

  // 4. Запись в БД
  return enqueue(async () => {
    const db = await getDatabase();

    let notesAdded = 0;
    let categoriesAdded = 0;
    let notesSkipped = 0;

    if (!merge) {
      // Полная замена — удаляем всё перед импортом
      await db.runAsync('DELETE FROM notes');
      await db.runAsync('DELETE FROM categories');
    }

    // Сначала категории — чтобы FK на заметки сработал
    for (const c of data.categories) {
      if (!c.id || !c.name) continue;

      const exists = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) as c FROM categories WHERE id = ?',
        c.id,
      );
      if (exists && exists.c > 0) continue; // дубликат — пропускаем

      await db.runAsync(
        'INSERT INTO categories (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
        c.id,
        c.name,
        c.color ?? '#6750A4',
        c.createdAt ?? Date.now(),
      );
      categoriesAdded++;
    }

    // Затем заметки
    for (const n of data.notes) {
      if (!n.id) continue;

      const exists = await db.getFirstAsync<{ c: number }>(
        'SELECT COUNT(*) as c FROM notes WHERE id = ?',
        n.id,
      );
      if (exists && exists.c > 0) {
        notesSkipped++;
        continue;
      }

      // Проверяем, что categoryId существует (иначе FK упадёт)
      let safeCategoryId: string | null = n.categoryId ?? null;
      if (safeCategoryId) {
        const catExists = await db.getFirstAsync<{ c: number }>(
          'SELECT COUNT(*) as c FROM categories WHERE id = ?',
          safeCategoryId,
        );
        if (!catExists || catExists.c === 0) safeCategoryId = null;
      }

      await db.runAsync(
        `INSERT INTO notes (id, title, content, categoryId, isPinned, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        n.id,
        n.title ?? '',
        n.content ?? '',
        safeCategoryId,
        n.isPinned ?? 0,
        n.createdAt ?? Date.now(),
        n.updatedAt ?? Date.now(),
      );
      notesAdded++;
    }

    return { notesAdded, categoriesAdded, notesSkipped };
  });
}
/**
 * Экспорт заметок в Markdown (ZIP).
 * Каждая заметка — отдельный .md файл с YAML-заголовком.
 * Подходит для Obsidian, Joplin, Logseq.
 */
export async function exportBackupMarkdown(): Promise<void> {
  return enqueue(async () => {
    const db = await getDatabase();

    const rows = await db.getAllAsync<Note & { categoryName: string | null }>(
      `SELECT n.*, c.name AS categoryName
       FROM notes n
       LEFT JOIN categories c ON c.id = n.categoryId
       WHERE n.deletedAt IS NULL
       ORDER BY n.updatedAt DESC`,
    );

    if (rows.length === 0) {
      throw new Error('Нет заметок для экспорта');
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();

    // Санитизация имени файла: убираем запрещённые символы
    const sanitize = (s: string): string =>
      s
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'Без названия';

    // Уникальное имя: если «Заметка.md» уже есть — «Заметка (2).md»
    const uniqueName = (base: string): string => {
      let name = `${base}.md`;
      let i = 2;
      while (usedNames.has(name)) {
        name = `${base} (${i}).md`;
        i++;
      }
      usedNames.add(name);
      return name;
    };

    for (const n of rows) {
      const title = sanitize(n.title || 'Без названия');

      // YAML frontmatter — Obsidian и Joplin его понимают
      const frontmatter = [
        '---',
        `title: "${(n.title || '').replace(/"/g, '\\"')}"`,
        n.categoryName ? `category: "${n.categoryName.replace(/"/g, '\\"')}"` : null,
        `created: ${new Date(n.createdAt).toISOString()}`,
        `updated: ${new Date(n.updatedAt).toISOString()}`,
        n.isPinned ? 'pinned: true' : null,
        '---',
        '',
      ]
        .filter((l) => l !== null)
        .join('\n');

      // Заголовок + текст
      const body = `# ${n.title || 'Без названия'}\n\n${n.content}\n`;

      zip.file(uniqueName(title), frontmatter + body);
    }

    // README с описанием
    const readme = [
      '# Мои заметки — экспорт',
      '',
      `Дата экспорта: ${new Date().toLocaleString('ru-RU')}`,
      `Заметок: ${rows.length}`,
      '',
      'Каждый файл — отдельная заметка в формате Markdown.',
      'YAML-заголовок содержит метаданные (title, category, created, updated, pinned).',
      '',
      'Подходит для импорта в Obsidian, Joplin, Logseq и другие редакторы.',
    ].join('\n');

    zip.file('README.md', readme);

    // Генерируем ZIP как base64
    const base64 = await zip.generateAsync({ type: 'base64' });

    const date = new Date().toISOString().slice(0, 10);
    const filename = `notebook-markdown-${date}.zip`;
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(base64, { encoding: 'base64' });

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing недоступен на этом устройстве');
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/zip',
      dialogTitle: 'Сохранить Markdown-архив',
      UTI: 'public.zip-archive',
    });
  });
}
