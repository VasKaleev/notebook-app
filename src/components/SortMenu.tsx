import { useMemo, useState } from 'react';
import { IconButton, Menu } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { SortBy } from '../store';

interface Props {
  value: SortBy;
  onChange: (s: SortBy) => void;
}

export default function SortMenu({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Строим метки внутри компонента — чтобы при смене языка обновились
  const labels = useMemo<Record<SortBy, string>>(
    () => ({
      updatedAt: t('settings.sortByDate'),
      createdAt: t('settings.sortByCreated'),
      title: t('settings.sortByTitle'),
    }),
    [t],
  );

  return (
    <Menu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={<IconButton icon="sort" onPress={() => setOpen(true)} />}>
      {(Object.keys(labels) as SortBy[]).map((key) => (
        <Menu.Item
          key={key}
          title={labels[key]}
          onPress={() => {
            onChange(key);
            setOpen(false);
          }}
          leadingIcon={value === key ? 'check' : undefined}
        />
      ))}
    </Menu>
  );
}
