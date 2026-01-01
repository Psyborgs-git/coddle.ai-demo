import React, { useRef, useEffect } from 'react';
import { Animated, Pressable } from 'react-native';
import { Box, Text } from './index';
import { Ionicons } from '@expo/vector-icons';

type AnimatedButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
};

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled = false,
  loading = false,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E0';
    switch (variant) {
      case 'primary':
        return '#0967D2';
      case 'secondary':
        return '#BAE0FF';
      case 'outline':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return '#0967D2';
    }
  };

  const getTextColor = () => {
    if (disabled) return '#A0AEC0';
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return '#0967D2';
      case 'outline':
        return '#0967D2';
      case 'ghost':
        return '#0967D2';
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return 8;
      case 'medium':
        return 12;
      case 'large':
        return 16;
      default:
        return 12;
    }
  };

  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1000, useNativeDriver: true })).start();
    } else {
      rotation.stopAnimation();
      rotation.setValue(0);
    }
  }, [loading]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable onPress={disabled || loading ? undefined : onPress} disabled={disabled || loading}>
      {({ pressed }) => (
        <Animated.View
          style={{
            transform: [{ scale: pressed ? 0.95 : 1 }],
            backgroundColor: getBackgroundColor(),
            borderRadius: 12,
            borderWidth: variant === 'outline' ? 2 : 0,
            borderColor: variant === 'outline' ? '#0967D2' : 'transparent',
            paddingHorizontal: getPadding() * 2,
            paddingVertical: getPadding(),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {loading ? (
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Ionicons name="sync" size={20} color={getTextColor()} />
            </Animated.View>
          ) : (
            <>
              {icon && (
                <Box marginRight="s">
                  <Ionicons name={icon} size={20} color={getTextColor()} />
                </Box>
              )}
              {typeof children === 'string' ? (
                <Text style={{ color: getTextColor(), fontWeight: '600', fontSize: 16 }}>
                  {children}
                </Text>
              ) : (
                children
              )}
            </>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
};
