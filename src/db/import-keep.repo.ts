import JSZip from 'jszip';
import * as DocumentPicker from 'expo-document-picker';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { getDatabase, generateId } from './database';
import { enqueue } from './queue';

interface KeepNote {
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  createdAt: number | null;
  updatedAt: number | null;
}

interface ImportResult {
  notesAdded: number;
  categoriesAdded: number;
  notesSkipped: number;
  errors: string[];
}

// ============================================================
// ПАРСИНГ HTML
// ============================================================

/**
 * Парсит HTML-файл Google Keep в структурированную заметку.
 * Keep экспортирует каждый note как отдельный HTML.
 */
function parseKeepHtml(html: string): KeepNote | null {
  // Заголовок: <div class="title">...</div> или <h1 class="title">...</h1>
  const titleMatch =
    html.match(/<div class="title"[^>]*>([\s\S]*?)<\/div>/) ||
    html.match(/<h1 class="title"[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? decodeHtml(titleMatch[1]).trim() : '';

  // Текст: <div class="content">...</div> или <div class="text">...</div>
  const contentMatch = html.match(/<div class="(?:content|text)"[^>]*>([\s\S]*?)<\/div>/);
  const content = contentMatch ? decodeHtml(contentMatch[1]).trim() : '';

  // Если ни заголовка, ни текста — пропускаем
  if (!title && !content) return null;

  // Теги: <span class="label">Работа</span>
  const tags: string[] = [];
  const tagRegex = /<span class="label"[^>]*>([\s\S]*?)<\/span>/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const tag = decodeHtml(tagMatch[1]).trim();
    if (tag) tags.push(tag);
  }

  // Флаги
  const isPinned = /class="[^"]*pinned[^"]*"/.test(html) || /pin/.test(html);
  const isArchived = /class="[^"]*archived[^"]*"/.test(html);
  const isTrashed = /class="[^"]*trashed[^"]*"/.test(html);

  // Даты: <span class="created">...</span>, <span class="updated">...</span>
  const createdMatch = html.match(/<span class="created"[^>]*>([\s\S]*?)<\/span>/);
  const updatedMatch = html.match(/<span class="updated"[^>]*>([\s\S]*?)<\/span>/);

  return {
    title,
    content,
    tags,
    isPinned,
    isArchived,
    isTrashed,
    createdAt: createdMatch ? parseKeepDate(createdMatch[1]) : null,
    updatedAt: updatedMatch ? parseKeepDate(updatedMatch[1]) : null,
  };
}

/** Декодирует HTML-сущности и убирает теги */
function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

/** Парсит дату из формата Keep: "Jan 15, 2024, 10:30:00 AM" */
function parseKeepDate(text: string): number | null {
  const clean = text.replace(/<[^>]+>/g, '').trim();
  if (!clean) return null;
  const date = new Date(clean);
  return isNaN(date.getTime()) ? null : date.getTime();
}

// ============================================================
// ИМПОРТ
// ============================================================

/**
 * Открыть ZIP из Google Takeout и импортировать заметки Keep.
 * merge = true → добавить к существующим, false → заменить всё.
 */
export async function importFromGoogleKeep(merge = true): Promise<ImportResult | null> {
  // 1. Выбор ZIP-файла
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/zip',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets?.[0]) return null;

  const uri = picked.assets[0].uri;

  // 2. Чтение ZIP в base64 через legacy API (File.base64() в SDK 54 нет)
  const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(base64, { base64: true });

  // 3. Поиск HTML-файлов Keep (внутри Takeout/Keep/)
  const htmlFiles: { name: string; content: string }[] = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!name.toLowerCase().endsWith('.html')) continue;
    if (!name.includes('Keep')) continue;

    const content = await entry.async('string');
    htmlFiles.push({ name, content });
  }

  if (htmlFiles.length === 0) {
    throw new Error('В архиве не найдено заметок Google Keep');
  }

  console.log(`[import-keep] найдено HTML-файлов: ${htmlFiles.length}`);

  // 4. Парсинг и импорт
  return enqueue(async () => {
    const db = await getDatabase();

    let notesAdded = 0;
    let categoriesAdded = 0;
    let notesSkipped = 0;
    const errors: string[] = [];

    if (!merge) {
      await db.runAsync('DELETE FROM notes');
      await db.runAsync('DELETE FROM categories');
    }

    // Кэш категорий по имени (чтобы не создавать дубликаты)
    const categoryCache = new Map<string, string>();

    const existingCats = await db.getAllAsync<{ id: string; name: string }>(
      'SELECT id, name FROM categories',
    );
    for (const c of existingCats) {
      categoryCache.set(c.name.toLowerCase(), c.id);
    }

    for (const { name, content } of htmlFiles) {
      try {
        const parsed = parseKeepHtml(content);
        if (!parsed) {
          notesSkipped++;
          continue;
        }

        // Пропускаем архивные и удалённые
        if (parsed.isArchived || parsed.isTrashed) {
          notesSkipped++;
          continue;
        }

        // Создаём категорию из первого тега
        let categoryId: string | null = null;
        if (parsed.tags.length > 0) {
          const tag = parsed.tags[0].toLowerCase();
          if (categoryCache.has(tag)) {
            categoryId = categoryCache.get(tag)!;
          } else {
            const catId = generateId();
            await db.runAsync(
              'INSERT INTO categories (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
              catId,
              parsed.tags[0],
              '#6750A4',
              Date.now(),
            );
            categoryCache.set(tag, catId);
            categoryId = catId;
            categoriesAdded++;
          }
        }

        // Создаём заметку
        const noteId = generateId();
        const now = Date.now();
        await db.runAsync(
          `INSERT INTO notes (id, title, content, categoryId, isPinned, createdAt, updatedAt, deletedAt, reminderAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
          noteId,
          parsed.title || 'Без названия',
          parsed.content,
          categoryId,
          parsed.isPinned ? 1 : 0,
          parsed.createdAt ?? now,
          parsed.updatedAt ?? now,
        );
        notesAdded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${name}: ${msg}`);
        console.warn('[import-keep] ошибка:', name, msg);
      }
    }

    console.log(
      `[import-keep] импорт завершён: заметок ${notesAdded}, категорий ${categoriesAdded}, пропущено ${notesSkipped}`,
    );

    return { notesAdded, categoriesAdded, notesSkipped, errors };
  });
}
