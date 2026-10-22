import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, SegmentedButtons, Snackbar, Text, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  useSettingsStore,
  type ThemeMode,
  type SortBy,
  type AppLanguage,
} from '../store/settingsStore';
import { useNotesStore } from '../store/notesStore';
import { useCategoriesStore } from '../store/categoriesStore';
import {
  exportBackupJson,
  exportBackupCsv,
  exportBackupMarkdown,
  pickAndImportJson,
} from '../db/backup.repo';
import { importFromGoogleKeep } from '../db/import-keep.repo';
import { exportAndSharePdf } from '../db/export-pdf.repo';
import type { RootStackParamList } from '../navigation/types';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const mode = useSettingsStore((s) => s.themeMode);
  const setMode = useSettingsStore((s) => s.setThemeMode);
  const defaultSortBy = useSettingsStore((s) => s.defaultSortBy);
  const setDefaultSortBy = useSettingsStore((s) => s.setDefaultSortBy);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const loadNotes = useNotesStore((s) => s.loadNotes);
  const loadCategories = useCategoriesStore((s) => s.loadCategories);

  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMd, setIsExportingMd] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingKeep, setIsImportingKeep] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const showError = (msg: string) => setSnack(msg);

  const isBusy = isExporting || isExportingMd || isExportingPdf || isImporting || isImportingKeep;

  // ----- ЭКСПОРТ JSON -----
  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      await exportBackupJson();
      setSnack(t('common.ok'));
    } catch (e) {
      console.error('[Settings] exportJson:', e);
      showError(t('errors.saveNote'));
    } finally {
      setIsExporting(false);
    }
  };

  // ----- ЭКСПОРТ CSV -----
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await exportBackupCsv();
      setSnack(t('common.ok'));
    } catch (e) {
      console.error('[Settings] exportCsv:', e);
      showError(t('errors.saveNote'));
    } finally {
      setIsExporting(false);
    }
  };

  // ----- ЭКСПОРТ MARKDOWN -----
  const handleExportMarkdown = async () => {
    setIsExportingMd(true);
    try {
      await exportBackupMarkdown();
      setSnack(t('common.ok'));
    } catch (e) {
      console.error('[Settings] exportMarkdown:', e);
      showError(e instanceof Error ? e.message : t('errors.saveNote'));
    } finally {
      setIsExportingMd(false);
    }
  };

  // ----- ЭКСПОРТ PDF -----
  const handleExportPdf = () => {
    Alert.alert(t('settings.exportPdf'), t('settings.exportPdfQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.exportPdfAll'),
        onPress: () => void runExportPdf('all'),
      },
      {
        text: t('settings.exportPdfByCategory'),
        onPress: () => void runExportPdf('category'),
      },
    ]);
  };

  const runExportPdf = async (exportMode: 'all' | 'category') => {
    setIsExportingPdf(true);
    try {
      await exportAndSharePdf({
        mode: exportMode,
        includeCategories: true,
        includeDates: true,
        locale: i18n.language === 'ru' ? 'ru' : 'en',
      });
      setSnack(t('common.ok'));
    } catch (e) {
      console.error('[Settings] exportPdf:', e);
      showError(e instanceof Error ? e.message : t('errors.saveNote'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ----- ИМПОРТ JSON -----
  const handleImport = async () => {
    Alert.alert(t('settings.importTitle'), t('settings.importQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.importMerge'),
        onPress: () => void runImport(true),
      },
      {
        text: t('settings.importReplace'),
        style: 'destructive',
        onPress: () => void runImport(false),
      },
    ]);
  };

  const runImport = async (merge: boolean) => {
    setIsImporting(true);
    try {
      const result = await pickAndImportJson(merge);
      if (!result) return;

      await Promise.all([loadNotes(), loadCategories()]);

      Alert.alert(
        t('settings.importDone'),
        [
          t('settings.importNotes', { count: result.notesAdded }),
          t('settings.importCategories', { count: result.categoriesAdded }),
          result.notesSkipped > 0
            ? t('settings.importSkipped', { count: result.notesSkipped })
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } catch (e) {
      console.error('[Settings] import:', e);
      showError(e instanceof Error ? e.message : t('errors.loadNotes'));
    } finally {
      setIsImporting(false);
    }
  };

  // ----- ИМПОРТ GOOGLE KEEP -----
  const handleImportKeep = async () => {
    Alert.alert(t('settings.importTitle'), t('settings.importQuestion'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.importMerge'),
        onPress: () => void runImportKeep(true),
      },
      {
        text: t('settings.importReplace'),
        style: 'destructive',
        onPress: () => void runImportKeep(false),
      },
    ]);
  };

  const runImportKeep = async (merge: boolean) => {
    setIsImportingKeep(true);
    try {
      const result = await importFromGoogleKeep(merge);
      if (!result) return;

      await Promise.all([loadNotes(), loadCategories()]);

      Alert.alert(
        t('settings.importDone'),
        [
          t('settings.importNotes', { count: result.notesAdded }),
          t('settings.importCategories', { count: result.categoriesAdded }),
          result.notesSkipped > 0
            ? t('settings.importSkipped', { count: result.notesSkipped })
            : null,
          result.errors.length > 0
            ? t('settings.importErrors', { count: result.errors.length })
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    } catch (e) {
      console.error('[Settings] importKeep:', e);
      showError(e instanceof Error ? e.message : t('errors.loadNotes'));
    } finally {
      setIsImportingKeep(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Тема */}
      <List.Section>
        <List.Subheader>{t('settings.theme')}</List.Subheader>
        <View style={styles.themeBlock}>
          <SegmentedButtons
            value={mode}
            onValueChange={(v) => void setMode(v as ThemeMode)}
            buttons={[
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      {/* Язык */}
      <List.Section>
        <List.Subheader>{t('settings.language')}</List.Subheader>
        <View style={styles.themeBlock}>
          <SegmentedButtons
            value={language}
            onValueChange={(v) => void setLanguage(v as AppLanguage)}
            buttons={[
              { value: 'system', label: t('settings.languageSystem') },
              { value: 'ru', label: 'RU' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      {/* Сортировка по умолчанию */}
      <List.Section>
        <List.Subheader>{t('settings.defaultSort')}</List.Subheader>
        <Text variant="bodySmall" style={styles.hint}>
          {t('settings.defaultSortHint')}
        </Text>
        <View style={styles.themeBlock}>
          <SegmentedButtons
            value={defaultSortBy}
            onValueChange={(v) => void setDefaultSortBy(v as SortBy)}
            buttons={[
              { value: 'updatedAt', label: t('settings.sortByDate') },
              { value: 'createdAt', label: t('settings.sortByCreated') },
              { value: 'title', label: t('settings.sortByTitle') },
            ]}
          />
        </View>
      </List.Section>

      <Divider />

      {/* Резервная копия */}
      <List.Section>
        <List.Subheader>{t('settings.backup')}</List.Subheader>
        <Text variant="bodySmall" style={styles.hint}>
          {t('settings.backupHint')}
        </Text>

        <Button
          mode="outlined"
          icon="download"
          loading={isExporting}
          disabled={isBusy}
          onPress={handleExportJson}
          style={styles.button}>
          {t('settings.exportJson')}
        </Button>

        <Button
          mode="outlined"
          icon="table"
          loading={isExporting}
          disabled={isBusy}
          onPress={handleExportCsv}
          style={styles.button}>
          {t('settings.exportCsv')}
        </Button>

        <Button
          mode="outlined"
          icon="language-markdown"
          loading={isExportingMd}
          disabled={isBusy}
          onPress={handleExportMarkdown}
          style={styles.button}>
          {t('settings.exportMarkdown')}
        </Button>

        <Button
          mode="outlined"
          icon="file-pdf-box"
          loading={isExportingPdf}
          disabled={isBusy}
          onPress={handleExportPdf}
          style={styles.button}>
          {t('settings.exportPdf')}
        </Button>

        <Button
          mode="contained"
          icon="upload"
          loading={isImporting}
          disabled={isBusy}
          onPress={handleImport}
          style={styles.button}>
          {t('settings.importJson')}
        </Button>

        <Button
          mode="outlined"
          icon="google"
          loading={isImportingKeep}
          disabled={isBusy}
          onPress={handleImportKeep}
          style={styles.button}>
          {t('settings.importKeep')}
        </Button>
      </List.Section>

      <Divider />

      {/* Корзина */}
      <List.Section>
        <List.Subheader>{t('settings.trashSection')}</List.Subheader>
        <List.Item
          title={t('trash.title')}
          description={t('trash.emptyDescription')}
          left={(p) => <List.Icon {...p} icon="delete-outline" />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => nav.navigate('Trash')}
        />
      </List.Section>

      <Divider />

      {/* О приложении */}
      <List.Section>
        <List.Subheader>{t('settings.about')}</List.Subheader>
        <List.Item
          title={t('settings.version')}
          description="1.0.0"
          left={(p) => <List.Icon {...p} icon="information-outline" />}
        />
        <List.Item
          title={t('settings.data')}
          description={t('settings.dataDescription')}
          left={(p) => <List.Icon {...p} icon="shield-lock-outline" />}
        />
      </List.Section>

      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={3000}>
        {snack ?? ''}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 32 },
  themeBlock: { paddingHorizontal: 16, paddingBottom: 8 },
  hint: { paddingHorizontal: 16, paddingBottom: 8, opacity: 0.6 },
  button: { marginHorizontal: 16, marginBottom: 8 },
});
