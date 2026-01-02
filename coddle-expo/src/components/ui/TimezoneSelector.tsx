import React, { useMemo, useState } from 'react';
import { Modal, View, FlatList, Pressable, TextInput, Switch } from 'react-native';
import { Box, Text, Button } from './index';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme';
import { useStore } from '../../store/useStore';

// Small curated list of common IANA timezones
const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Halifax',
  'America/Sao_Paulo',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const TimezoneSelector: React.FC<Props> = ({ visible, onClose }) => {
  const theme = useTheme<Theme>();
  const timezone = useStore(state => state.timezone);
  const dstOverride = useStore(state => state.dstOverride);
  const setTimezoneWithDst = useStore(state => state.setTimezoneWithDst);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(timezone || 'UTC');
  const [dst, setDst] = useState<'auto' | 'on' | 'off'>(dstOverride || 'auto');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TIMEZONES.filter(tz => tz.toLowerCase().includes(q));
  }, [query]);

  const handleSave = async () => {
    await setTimezoneWithDst(selected, dst);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Box flex={1} padding="l" backgroundColor="mainBackground" style={{ paddingTop: 20 }}>
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="l">
          <Pressable onPress={onClose}><Text variant="body" color="primary">Cancel</Text></Pressable>
          <Text variant="subtitle">Select Timezone</Text>
          <Pressable onPress={handleSave}><Text variant="body" color="primary" fontWeight="600">Save</Text></Pressable>
        </Box>

        <Text variant="body" marginBottom="s">Search</Text>
        <Box backgroundColor="cardBackground" borderRadius="m" marginBottom="m">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search timezones"
            placeholderTextColor={theme.colors.secondaryText}
            style={{ padding: 12, color: theme.colors.primaryText }}
          />
        </Box>

        <Box backgroundColor="cardBackground" borderRadius="m" padding="m" marginBottom="m">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text variant="body">DST Override</Text>
            <Box flexDirection="row" alignItems="center">
              <Text variant="caption" color="secondaryText" marginRight="s">Auto</Text>
              <Switch
                value={dst === 'on'}
                onValueChange={(v) => setDst(v ? 'on' : 'off')}
              />
              <Text variant="caption" color="secondaryText" marginLeft="s">On</Text>
            </Box>
          </Box>
          <Text variant="caption" color="secondaryText" marginTop="s">When set to Auto, DST is computed from timezone.</Text>
        </Box>

        <FlatList
          data={items}
          keyExtractor={(i) => i}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)}>
              <Box paddingVertical="s" style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.gray100 }}>
                <Text variant="body" fontWeight={item === selected ? '700' : '500'}>{item}</Text>
              </Box>
            </Pressable>
          )}
        />
      </Box>
    </Modal>
  );
};

export default TimezoneSelector;
