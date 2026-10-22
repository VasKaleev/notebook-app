import { StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <Searchbar
        placeholder={placeholder ?? t('notes.search')}
        value={value}
        onChangeText={onChangeText}
        style={styles.search}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  search: { borderRadius: 12 },
});
