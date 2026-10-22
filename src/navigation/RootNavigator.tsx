import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import type { RootStackParamList } from './types';

import TabsNavigator from './TabsNavigator';
import NoteEditScreen from '../screens/NoteEditScreen';
import TrashScreen from '../screens/TrashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}>
      <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />

      <Stack.Screen
        name="NoteEdit"
        component={NoteEditScreen}
        options={({ route }) => ({
          title: route.params?.noteId ? 'Редактирование' : 'Новая заметка',
          presentation: 'modal',
        })}
      />

      <Stack.Screen name="Trash" component={TrashScreen} options={{ title: 'Корзина' }} />
    </Stack.Navigator>
  );
}
