---

# 📄 `PRIVACY.md` (шаблон Privacy Policy)

```markdown
# Политика конфиденциальности / Privacy Policy

**Последнее обновление / Last updated:** 22 октября 2026 г.

## 🇷🇺 Русская версия

### 1. Общие сведения

Приложение **«Мои заметки»** (далее — «Приложение») разработано как локальный блокнот для создания и хранения личных заметок. Мы уважаем вашу конфиденциальность и стремимся защитить ваши данные.

### 2. Какие данные мы собираем

**Мы не собираем никаких персональных данных.**

Все заметки, категории, фото-вложения, чек-листы и настройки хранятся **исключительно на вашем устройстве** в локальной базе данных SQLite. Мы не имеем доступа к этим данным.

### 3. Передача данных третьим лицам

Мы **не передаём** ваши данные третьим лицам. Приложение не использует:

- Аналитические сервисы (Google Analytics, Firebase и т.п.)
- Рекламные сети
- Облачные серверы для синхронизации
- Сторонние SDK, собирающие данные

### 4. Разрешения приложения

Приложение запрашивает следующие разрешения:

| Разрешение | Зачем нужно |
|---|---|
| **Микрофон** | Для записи голосовых заметок (опционально) |
| **Камера** | Для прикрепления фото к заметкам (опционально) |
| **Доступ к фото** | Для выбора изображений из галереи (опционально) |
| **Уведомления** | Для напоминаний о заметках (опционально) |
| **Биометрия** | Для защиты приложения отпечатком/Face ID (опционально) |

Все разрешения используются **только** для указанных целей и не передают данные за пределы устройства.

### 5. Экспорт данных

Пользователь может самостоятельно экспортировать свои данные:

- в JSON, CSV, Markdown, PDF
- через системный диалог «Поделиться» (Google Drive, Telegram, почта и т.д.)

Куда сохранять экспортированные файлы — решает **только пользователь**.

### 6. Дети

Приложение не предназначено для детей младше 13 лет. Мы не собираем данные о детях.

### 7. Изменения в политике

Мы можем обновлять эту политику. Актуальная версия всегда доступна по этой ссылке. Дата последнего обновления указана в начале документа.

### 8. Контакты

По вопросам конфиденциальности: **kaleev.fam@mail.ru**

---

## 🇬🇧 English version

### 1. General

**"My Notes"** app (the "App") is a local notebook for creating and storing personal notes. We respect your privacy and are committed to protecting your data.

### 2. Data We Collect

**We do not collect any personal data.**

All notes, categories, photo attachments, checklists, and settings are stored **exclusively on your device** in a local SQLite database. We have no access to this data.

### 3. Third-Party Sharing

We **do not share** your data with third parties. The App does not use:

- Analytics services (Google Analytics, Firebase, etc.)
- Advertising networks
- Cloud servers for synchronization
- Third-party SDKs that collect data

### 4. App Permissions

The App requests the following permissions:

| Permission        | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| **Microphone**    | For voice notes (optional)                      |
| **Camera**        | For attaching photos (optional)                 |
| **Photo library** | For picking images from gallery (optional)      |
| **Notifications** | For note reminders (optional)                   |
| **Biometrics**    | For app lock via fingerprint/Face ID (optional) |

All permissions are used **only** for the stated purposes and do not transmit data outside the device.

### 5. Data Export

Users can export their data:

- to JSON, CSV, Markdown, PDF
- via system "Share" dialog (Google Drive, Telegram, email, etc.)

Where to save exported files is **entirely up to the user**.

### 6. Children

The App is not intended for children under 13. We do not collect data from children.

### 7. Changes to This Policy

We may update this policy. The current version is always available at this link. The date of the last update is shown at the top of this document.

### 8. Contact

For privacy questions: **kaleev.fam@mail.ru**

---

## 📎 Data Safety (Google Play)

При заполнении формы **Data Safety** в Google Play Console укажите:

- **Does your app collect or share any of the required user data types?** → **No**
- **Is all of the user data collected by your app encrypted in transit?** → **Not applicable** (данные не передаются)
- **Do you provide a way for users to request that their data is deleted?** → **Yes** (пользователь удаляет заметки самостоятельно)

Это соответствует действительности: приложение работает полностью офлайн.
