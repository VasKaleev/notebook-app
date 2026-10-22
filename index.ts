import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './src/widgets/android/widget-task-handler';

// Регистрируем основное приложение
registerRootComponent(App);

// Регистрируем обработчик виджета
registerWidgetTaskHandler(widgetTaskHandler);
