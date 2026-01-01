import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme';

type Props = {
  onPress: () => void;
};

export const FAB: React.FC<Props> = ({ onPress }) => {
  const theme = useTheme<Theme>();
  return (
    <Pressable
      onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      style={[styles.fab, { backgroundColor: theme.colors.primary }]}
    >
      <Ionicons name="rocket" size={28} color={theme.colors.white} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 130,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
    zIndex: 50,
  },
});