<<<<<<< HEAD
# 📝 Мои заметки (My Notes)

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-4630EB?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)](https://www.android.com)

**Мощный блокнот для Android** на React Native + Expo. Заметки, категории, поиск, напоминания, чек-листы, фото-вложения, экспорт в JSON/CSV/Markdown/PDF, импорт из Google Keep, локализация RU/EN, биометрическая защита и виджет на главный экран.

Все данные хранятся **локально** в SQLite. Никакой аналитики, серверов и рекламы.

---

## 📸 Скриншоты

> 💡 Замените пути на свои скриншоты. Положите их в `docs/screenshots/`.

| Список заметок                            | Редактор                                | Категории                                      |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| ![Notes](docs/screenshots/notes-list.png) | ![Edit](docs/screenshots/note-edit.png) | ![Categories](docs/screenshots/categories.png) |

| Чек-лист                                     | Настройки                                  | Тёмная тема                              |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| ![Checklist](docs/screenshots/checklist.png) | ![Settings](docs/screenshots/settings.png) | ![Dark](docs/screenshots/dark-theme.png) |

---

## ✨ Функции

### 📝 Заметки

- Создание, редактирование, удаление заметок
- Автосохранение через 1.5 секунды после ввода
- Закрепление важных заметок (pin) — всегда сверху
- Сортировка: по дате изменения, создания или названию
- Поиск по нескольким словам (`работа отчёт` найдёт `Отчёт по работе`)
- Подсветка совпадений в результатах поиска

### 📂 Категории

- Создание категорий с цветными метками
- Счётчик заметок в каждой категории
- Фильтр по категории в списке заметок

### 🔔 Напоминания

- Установка даты и времени напоминания
- Push-уведомление приходит, даже если приложение закрыто
- Индикатор на карточке заметки (просроченные — красным)

### ✅ Чек-листы

- Режим «Текст / Чек-лист» в редакторе
- Список задач с чекбоксами
- Прогресс `3/5` на карточке заметки

### 🖼️ Фото-вложения

- Прикрепление фото из галереи или камеры
- Миниатюры в редакторе
- Файлы хранятся в приватной папке приложения

### 💾 Экспорт и импорт

- **JSON** — полная резервная копия
- **CSV** — для Excel / Google Sheets
- **Markdown** — для Obsidian, Joplin, Logseq
- **PDF** — красиво отформатированные заметки
- **Импорт из JSON** — с опциями «добавить» / «заменить»
- **Импорт из Google Keep** — через ZIP из Google Takeout

### 🎨 Персонализация

- Тёмная / светлая / системная тема
- Выбор сортировки по умолчанию
- Локализация RU / EN (переключение в настройках)

### 🔒 Безопасность

- Биометрическая защита (отпечаток / Face ID)
- Все данные только на устройстве
- Мусорная корзина с TTL 30 дней

### 📱 Android-виджет

- Последние 3 заметки на главном экране
- Быстрое создание новой заметки

---

## 🛠️ Стек

| Слой            | Технология                                           |
| --------------- | ---------------------------------------------------- |
| **Framework**   | Expo SDK 54, React Native 0.81                       |
| **Язык**        | TypeScript 5.9 (strict)                              |
| **UI**          | React Native Paper 5.15 (Material Design 3)          |
| **Навигация**   | React Navigation 7 (Bottom Tabs + Stack)             |
| **База данных** | expo-sqlite 16 (с очередью `enqueue`)                |
| **Состояние**   | Zustand 5                                            |
| **Настройки**   | AsyncStorage 2.2                                     |
| **Уведомления** | expo-notifications                                   |
| **Биометрия**   | expo-local-authentication                            |
| **Файлы**       | expo-file-system, expo-sharing, expo-document-picker |
| **Фото**        | expo-image-picker                                    |
| **PDF**         | expo-print                                           |
| **Локализация** | i18next, react-i18next, expo-localization            |
| **Виджет**      | react-native-android-widget                          |

---

## 🚀 Установка и запуск

### Требования

- Node.js 20+
- npm или yarn
- Android Studio + эмулятор (или реальный телефон с Expo Go)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/vasilyk/notebook-app.git
cd notebook-app

```

### 2. Установить зависимости

npm install

### 3. Запустить в режиме разработки

npx expo start

### Телефон: отсканируй QR через Expo Go (SDK 54).

### Эмулятор: нажми a в терминале.

### Development build: npx expo run:android (для напоминаний, виджета).

### 4. Production-сборка (AAB для Google Play)

bash

eas build --platform android --profile production

📁 Структура проекта
text

src/
├── components/ UI-компоненты (NoteCard, SearchBar, EmptyState, SortMenu, HighlightedText, ErrorBoundary)
├── screens/ Экраны (NotesList, NoteEdit, Categories, Trash, Settings, Onboarding, Lock)
├── navigation/ React Navigation (RootNavigator, TabsNavigator, types)
├── store/ Zustand (notesStore, categoriesStore, settingsStore)
├── db/ SQLite (database, schema, migrations, queue, repositories)
├── services/ Нативные сервисы (notifications, attachments)
├── widgets/android/ Android-виджет (NotesWidget, widget-task-handler)
├── hooks/ useDebounce, useBiometricAuth
├── theme/ Material Design 3 темы
├── i18n/ Локализация (ru.json, en.json, index.ts)
└── types/ TypeScript-типы (Note, Category, Attachment, ChecklistItem)

assets/ Иконки, splash
docs/screenshots/ Скриншоты для README
App.tsx Корневой компонент
index.ts Точка входа (registerRootComponent + widgetTaskHandler)

🗄️ База данных

Схема (версия 6):

    categories — категории

    notes — заметки (deletedAt, reminderAt, audioUri, noteType)

    attachments — фото-вложения

    checklist_items — пункты чек-листов

Миграции идемпотентны, с PRAGMA table_info и sqlite_master проверками. Страховки в database.ts гарантируют наличие критичных колонок даже при «битой» базе.
🌍 Локализация

    Автоматическое определение языка системы

    Переключение RU / EN в настройках

    Plural-формы для русского (1 заметка / 2 заметки / 5 заметок)

    Форматирование дат в локали (ru-RU / en-US)

🤝 Вклад

    Форкни репозиторий

    Создай ветку (git checkout -b feature/my-feature)

    Закоммить изменения (git commit -m 'Add my feature')

    Запушь (git push origin feature/my-feature)

    Открой Pull Request

📄 Лицензия

MIT License. Смотри LICENSE.
📬 Контакты

    Автор: Vasily K.

    Email: kaleev.fam@mail.ru

    GitHub: https://github.com/VasKaleev

🙏 Благодарности

    Expo — за платформу

    React Native Paper — за Material Design 3

    Zustand — за простой state management

    i18next — за локализацию
=======
# 📝 Мои заметки (My Notes)

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-4630EB?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)](https://www.android.com)

**Мощный блокнот для Android** на React Native + Expo. Заметки, категории, поиск, напоминания, чек-листы, фото-вложения, экспорт в JSON/CSV/Markdown/PDF, импорт из Google Keep, локализация RU/EN, биометрическая защита и виджет на главный экран.

Все данные хранятся **локально** в SQLite. Никакой аналитики, серверов и рекламы.

---

## 📸 Скриншоты

> 💡 Замените пути на свои скриншоты. Положите их в `docs/screenshots/`.

| Список заметок                            | Редактор                                | Категории                                      |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| ![Notes](docs/screenshots/notes-list.png) | ![Edit](docs/screenshots/note-edit.png) | ![Categories](docs/screenshots/categories.png) |

| Чек-лист                                     | Настройки                                  | Тёмная тема                              |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| ![Checklist](docs/screenshots/checklist.png) | ![Settings](docs/screenshots/settings.png) | ![Dark](docs/screenshots/dark-theme.png) |

---

## ✨ Функции

### 📝 Заметки

- Создание, редактирование, удаление заметок
- Автосохранение через 1.5 секунды после ввода
- Закрепление важных заметок (pin) — всегда сверху
- Сортировка: по дате изменения, создания или названию
- Поиск по нескольким словам (`работа отчёт` найдёт `Отчёт по работе`)
- Подсветка совпадений в результатах поиска

### 📂 Категории

- Создание категорий с цветными метками
- Счётчик заметок в каждой категории
- Фильтр по категории в списке заметок

### 🔔 Напоминания

- Установка даты и времени напоминания
- Push-уведомление приходит, даже если приложение закрыто
- Индикатор на карточке заметки (просроченные — красным)

### ✅ Чек-листы

- Режим «Текст / Чек-лист» в редакторе
- Список задач с чекбоксами
- Прогресс `3/5` на карточке заметки

### 🖼️ Фото-вложения

- Прикрепление фото из галереи или камеры
- Миниатюры в редакторе
- Файлы хранятся в приватной папке приложения

### 💾 Экспорт и импорт

- **JSON** — полная резервная копия
- **CSV** — для Excel / Google Sheets
- **Markdown** — для Obsidian, Joplin, Logseq
- **PDF** — красиво отформатированные заметки
- **Импорт из JSON** — с опциями «добавить» / «заменить»
- **Импорт из Google Keep** — через ZIP из Google Takeout

### 🎨 Персонализация

- Тёмная / светлая / системная тема
- Выбор сортировки по умолчанию
- Локализация RU / EN (переключение в настройках)

### 🔒 Безопасность

- Биометрическая защита (отпечаток / Face ID)
- Все данные только на устройстве
- Мусорная корзина с TTL 30 дней

### 📱 Android-виджет

- Последние 3 заметки на главном экране
- Быстрое создание новой заметки

---

## 🛠️ Стек

| Слой            | Технология                                           |
| --------------- | ---------------------------------------------------- |
| **Framework**   | Expo SDK 54, React Native 0.81                       |
| **Язык**        | TypeScript 5.9 (strict)                              |
| **UI**          | React Native Paper 5.15 (Material Design 3)          |
| **Навигация**   | React Navigation 7 (Bottom Tabs + Stack)             |
| **База данных** | expo-sqlite 16 (с очередью `enqueue`)                |
| **Состояние**   | Zustand 5                                            |
| **Настройки**   | AsyncStorage 2.2                                     |
| **Уведомления** | expo-notifications                                   |
| **Биометрия**   | expo-local-authentication                            |
| **Файлы**       | expo-file-system, expo-sharing, expo-document-picker |
| **Фото**        | expo-image-picker                                    |
| **PDF**         | expo-print                                           |
| **Локализация** | i18next, react-i18next, expo-localization            |
| **Виджет**      | react-native-android-widget                          |

---

## 🚀 Установка и запуск

### Требования

- Node.js 20+
- npm или yarn
- Android Studio + эмулятор (или реальный телефон с Expo Go)

### 1. Клонировать репозиторий

```bash
git clone https://github.com/vasilyk/notebook-app.git
cd notebook-app

```

### 2. Установить зависимости

npm install

### 3. Запустить в режиме разработки

npx expo start

### Телефон: отсканируй QR через Expo Go (SDK 54).

### Эмулятор: нажми a в терминале.

### Development build: npx expo run:android (для напоминаний, виджета).

### 4. Production-сборка (AAB для Google Play)

bash

eas build --platform android --profile production

📁 Структура проекта
text

src/
### ├── components/ UI-компоненты (NoteCard, SearchBar, EmptyState, SortMenu, HighlightedText, ErrorBoundary)
### ├── screens/ Экраны (NotesList, NoteEdit, Categories, Trash, Settings, Onboarding, Lock)
### ├── navigation/ React Navigation (RootNavigator, TabsNavigator, types)
### ├── store/ Zustand (notesStore, categoriesStore, settingsStore)
### ├── db/ SQLite (database, schema, migrations, queue, repositories)
### ├── services/ Нативные сервисы (notifications, attachments)
### ├── widgets/android/ Android-виджет (NotesWidget, widget-task-handler)
### ├── hooks/ useDebounce, useBiometricAuth
### ├── theme/ Material Design 3 темы
### ├── i18n/ Локализация (ru.json, en.json, index.ts)
### └── types/ TypeScript-типы (Note, Category, Attachment, ChecklistItem)

assets/ Иконки, splash
docs/screenshots/ Скриншоты для README
App.tsx Корневой компонент
index.ts Точка входа (registerRootComponent + widgetTaskHandler)

🗄️ База данных

Схема (версия 6):

    categories — категории

    notes — заметки (deletedAt, reminderAt, audioUri, noteType)

    attachments — фото-вложения

    checklist_items — пункты чек-листов

Миграции идемпотентны, с PRAGMA table_info и sqlite_master проверками. Страховки в database.ts гарантируют наличие критичных колонок даже при «битой» базе.
🌍 Локализация

    Автоматическое определение языка системы

    Переключение RU / EN в настройках

    Plural-формы для русского (1 заметка / 2 заметки / 5 заметок)

    Форматирование дат в локали (ru-RU / en-US)

🤝 Вклад

    Форкни репозиторий

    Создай ветку (git checkout -b feature/my-feature)

    Закоммить изменения (git commit -m 'Add my feature')

    Запушь (git push origin feature/my-feature)

    Открой Pull Request

📄 Лицензия

MIT License. Смотри LICENSE.
📬 Контакты

    Автор: Vasily K.

    Email: kaleev.fam@mail.ru

    GitHub: https://github.com/VasKaleev

🙏 Благодарности

    Expo — за платформу

    React Native Paper — за Material Design 3

    Zustand — за простой state management

    i18next — за локализацию
>>>>>>> 962791dcb5abf9d38e50e9378bc7203c85e6c4fc
# notebook-app-PRIVACY
