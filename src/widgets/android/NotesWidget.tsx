'use no memo';

import React from 'react';
import { FlexWidget, TextWidget, ListWidget } from 'react-native-android-widget';

export interface NotesWidgetProps {
  notes: Array<{ id: string; title: string }>;
}

export function NotesWidget({ notes }: NotesWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: '#FEF7FF',
        borderRadius: 16,
        padding: 12,
      }}>
      {/* Заголовок */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}>
        <TextWidget
          text="Мои заметки"
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: '#6750A4',
          }}
        />
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'notebook:///note/new' }}
          style={{
            backgroundColor: '#6750A4',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}>
          <TextWidget text="+" style={{ fontSize: 14, color: '#FFFFFF' }} />
        </FlexWidget>
      </FlexWidget>

      {/* Список заметок */}
      {notes.length === 0 ? (
        <TextWidget
          text="Нет заметок"
          style={{
            fontSize: 12,
            color: '#666',
            flex: 1,
            textAlign: 'center',
            verticalAlignment: 'center',
          }}
        />
      ) : (
        <ListWidget
          style={{
            height: 'match_parent',
            width: 'match_parent',
          }}>
          {notes.slice(0, 3).map((note) => (
            <FlexWidget
              key={note.id}
              clickAction="OPEN_URI"
              clickActionData={{ uri: `notebook:///note/${note.id}` }}
              style={{
                width: 'match_parent',
                paddingVertical: 4,
              }}>
              <TextWidget
                text={note.title || 'Без названия'}
                style={{
                  fontSize: 12,
                  color: '#1D1B20',
                }}
                maxLines={1}
              />
            </FlexWidget>
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
