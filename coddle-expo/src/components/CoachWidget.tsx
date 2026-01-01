import React from 'react';
import { Pressable } from 'react-native';
import { Box, Text } from './ui';
import { CoachTip } from '../types';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../theme';

type Props = {
  tips: CoachTip[];
  onTapTip?: (tip: CoachTip) => void;
};

export const CoachWidget: React.FC<Props> = ({ tips, onTapTip }) => {
  const theme = useTheme<Theme>();

  if (!tips || tips.length === 0) return null;

  return (
    <Box backgroundColor="cardBackground" padding="m" borderRadius="m" marginBottom="m">
      <Text variant="subtitle" marginBottom="s">Coach Tips</Text>
      {tips.map(t => (
        <Pressable key={t.id} onPress={() => onTapTip && onTapTip(t)}>
          <Box paddingVertical="s">
            <Text variant="body" fontWeight="600">{t.title}</Text>
            <Text variant="caption" color="secondaryText">{t.message}</Text>
          </Box>
        </Pressable>
      ))}
    </Box>
  );
};
