import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type TabsParamList = {
  NotesTab: undefined;
  CategoriesTab: undefined;
  SettingsTab: undefined;
};

// ВАЖНО: только одно объявление RootStackParamList
export type RootStackParamList = {
  Tabs: undefined;
  NoteEdit: { noteId?: string; categoryId?: string | null };
  Trash: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabsScreenProps<T extends keyof TabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Глобальная типизация useNavigation без явных дженериков
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
