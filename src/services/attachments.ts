import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { generateId } from '../db/database';

const ATTACHMENTS_DIR = 'attachments';

/**
 * Результат выбора изображения — то, что нужно для createAttachment.
 */
export interface PickedImage {
  uri: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
}

// ============================================================
// ПАПКА
// ============================================================

/** Убедиться, что папка attachments существует в приватном хранилище */
function ensureAttachmentsDir(): Directory {
  const dir = new Directory(Paths.document, ATTACHMENTS_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

// ============================================================
// ВЫБОР ИЗ ГАЛЕРЕИ
// ============================================================

/**
 * Открыть галерею, выбрать одно изображение и скопировать
 * в приватную папку приложения.
 * Возвращает null, если пользователь отменил выбор.
 */
export async function pickImageFromGallery(): Promise<PickedImage | null> {
  // Разрешение на доступ к галерее
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Нет доступа к галерее');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: false,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  return saveImage(result.assets[0]);
}

// ============================================================
// СЪЁМКА НА КАМЕРУ
// ============================================================

/**
 * Открыть камеру, сделать фото и скопировать в приватную папку.
 * Возвращает null, если пользователь отменил.
 */
export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Нет доступа к камере');
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  return saveImage(result.assets[0]);
}

// ============================================================
// СОХРАНЕНИЕ В ПРИВАТНУЮ ПАПКУ
// ============================================================

/**
 * Скопировать выбранное изображение из кэша ImagePicker
 * в приватную папку приложения.
 *
 * Почему копируем: ImagePicker отдаёт URI в кэше, который
 * система может очистить в любой момент. В Paths.document
 * файл живёт, пока его не удалит приложение.
 */
async function saveImage(asset: ImagePicker.ImagePickerAsset): Promise<PickedImage> {
  const dir = ensureAttachmentsDir();

  // Расширение из URI (jpg, png, heic, ...)
  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${generateId()}.${ext}`;
  const destFile = new File(dir, filename);

  // Копируем из кэша в приватную папку
  const srcFile = new File(asset.uri);
  srcFile.copy(destFile);

  return {
    uri: destFile.uri,
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
  };
}

// ============================================================
// УТИЛИТЫ
// ============================================================

/**
 * Удалить файл вложения с диска.
 * Используется как fallback, если deleteAttachment в репозитории
 * не смог удалить (например, файла уже нет).
 */
export function deleteAttachmentFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('[services/attachments] deleteAttachmentFile:', e);
  }
}
