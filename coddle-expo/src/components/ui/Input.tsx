import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { Box, Text } from './index';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  const theme = useTheme<Theme>();

  return (
    <Box marginBottom="m">
      {label && (
        <Text variant="caption" marginBottom="xs" fontWeight="600">
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.white,
            borderColor: error ? theme.colors.error : theme.colors.border,
            borderRadius: theme.borderRadii.s,
            padding: theme.spacing.m,
            fontSize: 16,
            color: theme.colors.primaryText,
          },
          style,
        ]}
        placeholderTextColor={theme.colors.tertiaryText}
        {...props}
      />
      {error && (
        <Text variant="caption" color="error" marginTop="xs">
          {error}
        </Text>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
  },
});
