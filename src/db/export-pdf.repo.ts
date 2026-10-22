import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { getDatabase } from './database';
import { enqueue } from './queue';
import type { Note, Category } from '../types/models';

export type PdfExportMode = 'all' | 'category' | 'single';

interface ExportOptions {
  mode: PdfExportMode;
  categoryId?: string | null; // для mode='category'
  noteId?: string; // для mode='single'
  includeCategories?: boolean; // показывать ли метку категории
  includeDates?: boolean; // показывать ли дату изменения
  locale?: 'ru' | 'en'; // язык заголовков PDF
}

const LABELS = {
  ru: {
    title: 'Мои заметки',
    category: 'Категория',
    updated: 'Изменено',
    noCategory: 'Без категории',
    untitled: 'Без названия',
    exportedAt: 'Экспортировано',
    totalNotes: 'Всего заметок',
    empty: 'Нет заметок для экспорта',
  },
  en: {
    title: 'My Notes',
    category: 'Category',
    updated: 'Updated',
    noCategory: 'No category',
    untitled: 'Untitled',
    exportedAt: 'Exported',
    totalNotes: 'Total notes',
    empty: 'No notes to export',
  },
} as const;

/**
 * Экранирование HTML: чтобы пользовательский текст не сломал разметку.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br/>');
}

/**
 * Генерирует HTML для PDF.
 * Стили инлайн — WebView внутри expo-print не подгружает внешние CSS.
 */
function buildHtml(notes: (Note & { categoryName: string | null })[], opts: ExportOptions): string {
  const locale = opts.locale ?? 'ru';
  const L = LABELS[locale];

  const dateLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const now = new Date().toLocaleString(dateLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const notesHtml = notes
    .map((n) => {
      const title = escapeHtml(n.title || L.untitled);
      const content = escapeHtml(n.content);

      const metaParts: string[] = [];
      if (opts.includeCategories && n.categoryName) {
        metaParts.push(`${L.category}: ${escapeHtml(n.categoryName)}`);
      }
      if (opts.includeDates) {
        const dateStr = new Date(n.updatedAt).toLocaleString(dateLocale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        metaParts.push(`${L.updated}: ${dateStr}`);
      }

      return `
        <section class="note">
          <h2>${title}</h2>
          ${metaParts.length > 0 ? `<div class="meta">${metaParts.join(' · ')}</div>` : ''}
          <div class="content">${content}</div>
        </section>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #1D1B20;
    margin: 0;
    padding: 24px;
  }
  header {
    border-bottom: 2px solid #6750A4;
    padding-bottom: 12px;
    margin-bottom: 24px;
  }
  header h1 {
    color: #6750A4;
    font-size: 22px;
    margin: 0 0 4px 0;
  }
  header .subtitle {
    color: #666;
    font-size: 11px;
  }
  .note {
    page-break-inside: avoid;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px dashed #ccc;
  }
  .note:last-child {
    border-bottom: none;
  }
  .note h2 {
    font-size: 16px;
    margin: 0 0 4px 0;
    color: #1D1B20;
  }
  .note .meta {
    color: #666;
    font-size: 11px;
    margin-bottom: 8px;
  }
  .note .content {
    line-height: 1.5;
    white-space: normal;
  }
  .empty {
    text-align: center;
    color: #999;
    padding: 48px 0;
  }
  footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #eee;
    color: #999;
    font-size: 10px;
    text-align: center;
  }
</style>
</head>
<body>
  <header>
    <h1>${L.title}</h1>
    <div class="subtitle">
      ${L.exportedAt}: ${now} · ${L.totalNotes}: ${notes.length}
    </div>
  </header>
  ${notes.length === 0 ? `<div class="empty">${L.empty}</div>` : notesHtml}
  <footer>${L.title} · ${now}</footer>
</body>
</html>
  `;
}

/**
 * Экспорт заметок в PDF.
 * Возвращает URI файла или null, если заметок нет.
 */
export async function exportNotesToPdf(options: ExportOptions): Promise<string | null> {
  return enqueue(async () => {
    const db = await getDatabase();

    // 1. Загружаем заметки с учётом режима
    const where: string[] = ['n.deletedAt IS NULL'];
    const params: (string | number)[] = [];

    if (options.mode === 'single' && options.noteId) {
      where.push('n.id = ?');
      params.push(options.noteId);
    } else if (options.mode === 'category' && options.categoryId) {
      where.push('n.categoryId = ?');
      params.push(options.categoryId);
    }

    const notes = await db.getAllAsync<Note & { categoryName: string | null }>(
      `SELECT n.*, c.name AS categoryName
       FROM notes n
       LEFT JOIN categories c ON c.id = n.categoryId
       WHERE ${where.join(' AND ')}
       ORDER BY n.isPinned DESC, n.updatedAt DESC`,
      ...params,
    );

    if (notes.length === 0) {
      console.warn('[export-pdf] нет заметок для экспорта');
      return null;
    }

    // 2. Генерируем HTML
    const html = buildHtml(notes, options);

    // 3. Конвертируем в PDF
    const { uri } = await Print.printToFileAsync({ html });

    // 4. Переименовываем файл понятным именем
    const date = new Date().toISOString().slice(0, 10);
    const filename = `notebook-${date}.pdf`;
    const dest = new File(Paths.cache, filename);

    // Если файл уже есть — перезаписываем
    if (dest.exists) dest.delete();

    // Копируем из временного uri в наш файл
    const src = new File(uri);
    src.copy(dest);

    console.log('[export-pdf] готово:', dest.uri, `(${notes.length} заметок)`);

    return dest.uri;
  });
}

/**
 * Экспортировать и сразу открыть системный диалог «Поделиться».
 */
export async function exportAndSharePdf(options: ExportOptions): Promise<void> {
  const uri = await exportNotesToPdf(options);
  if (!uri) throw new Error('Нет заметок для экспорта');

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing недоступен на этом устройстве');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Сохранить PDF',
    UTI: 'com.adobe.pdf',
  });
}
