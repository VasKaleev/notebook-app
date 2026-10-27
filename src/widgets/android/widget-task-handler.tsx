import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { NotesWidget } from './NotesWidget';
import { getDatabase } from '../../db/database';
import type { Note } from '../../types/models';

const WIDGET_NAME = 'NotesWidget';

/**
 * Загружает до 3 последних активных заметок.
 * Используем getDatabase напрямую — обработчик виджета
 * работает вне React-дерева, хуки недоступны.
 */
async function loadRecentNotes(): Promise<Array<{ id: string; title: string }>> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Pick<Note, 'id' | 'title'>>(
      `SELECT id, title FROM notes
       WHERE deletedAt IS NULL
       ORDER BY isPinned DESC, updatedAt DESC
       LIMIT 3`,
    );
    return rows;
  } catch (e) {
    console.warn('[widget] loadRecentNotes:', e);
    return [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction } = props;

  if (widgetAction === 'WIDGET_ADDED' || widgetAction === 'WIDGET_UPDATE') {
    const notes = await loadRecentNotes();
    props.renderWidget(<NotesWidget notes={notes} />);
  }

  if (widgetAction === 'WIDGET_CLICK') {
    // Клик по виджету обрабатывается через clickAction в UI.
    // Здесь — fallback, если понадобится кастомная логика.
    console.log('[widget] click:', props.clickAction);
  }

  if (widgetAction === 'WIDGET_DELETED') {
    console.log('[widget] deleted');
  }
}
