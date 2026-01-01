import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const tabs = [
  { name: 'Log', icon: 'moon' as const, iconOutline: 'moon-outline' as const },
  { name: 'Timeline', icon: 'analytics' as const, iconOutline: 'analytics-outline' as const },
  { name: 'Schedule', icon: 'calendar' as const, iconOutline: 'calendar-outline' as const },
  { name: 'Coach', icon: 'bulb' as const, iconOutline: 'bulb-outline' as const },
  { name: 'Settings', icon: 'settings' as const, iconOutline: 'settings-outline' as const },
];

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.cardBackground, 
          shadowColor: theme.colors.black,
          paddingBottom: Math.max(insets.bottom, 16),
        }
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const tabConfig = tabs[index];

        return (
          <TabBarButton
            key={route.name}
            isFocused={isFocused}
            onPress={onPress}
            label={tabConfig.name}
            icon={tabConfig.icon}
            iconOutline={tabConfig.iconOutline}
            theme={theme}
          />
        );
      })}
    </View>
  );
};

type TabBarButtonProps = {
  isFocused: boolean;
  onPress: () => void;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  theme: Theme;
};

const TabBarButton: React.FC<TabBarButtonProps> = ({ 
  isFocused, 
  onPress, 
  label, 
  icon, 
  iconOutline,
  theme 
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isFocused ? -4 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { 
        toValue: isFocused ? 1.1 : 1, 
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.spring(translateY, { 
        toValue: isFocused ? -4 : 0, 
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(bgOpacity, { 
        toValue: isFocused ? 1 : 0, 
        duration: 200, 
        useNativeDriver: true 
      }),
    ]).start();
  }, [isFocused]);

  return (
    <Pressable 
      onPress={onPress} 
      style={styles.tabButton}
      android_ripple={{ color: theme.colors.primaryLight, borderless: true }}
    >
      {({ pressed }) => (
        <Animated.View 
          style={[
            styles.tabContent, 
            { 
              transform: [
                { scale: pressed ? 0.9 : 1 },
                { translateY }
              ] 
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.iconContainer
            ]} 
          />
          <Animated.View style={[
            styles.iconWrapper, 
            { transform: [{ scale }]}
          ]}>
            <Ionicons
              name={isFocused ? icon : iconOutline}
              size={24}
              color={isFocused ? theme.colors.primary : theme.colors.secondaryText}
            />
          </Animated.View>
          <Text
            variant="caption"
            color={isFocused ? 'primary' : 'secondaryText'}
            fontWeight={isFocused ? '600' : '400'}
            marginTop="xs"
            style={{ fontSize: 11 }}
          >
            {label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 8,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minHeight: 60
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 50,
    minHeight: 50,
  },
  iconContainer: {
    position: 'absolute',
    top: -8,
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  iconWrapper: {
    zIndex: 1,
  },
});
