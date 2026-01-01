import React, { useEffect, useState } from 'react';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@shopify/restyle';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useStore } from './src/store/useStore';
import { db } from './src/services/database';
import { NotificationService } from './src/services/notifications';
import theme, { darkTheme } from './src/theme';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import 'react-native-get-random-values';
import { FAB } from './src/components/ui/FAB';
import { Text } from './src/components/ui';

// Custom Toast configuration
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#10B981', marginTop: 50 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '600' }}
      text2Style={{ fontSize: 13, color: '#666' }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#EF4444', marginTop: 50 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '600' }}
      text2Style={{ fontSize: 13, color: '#666' }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3B82F6', marginTop: 50 }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{ fontSize: 15, fontWeight: '600' }}
      text2Style={{ fontSize: 13, color: '#666' }}
    />
  ),
};

export default function App() {
  const loadData = useStore(state => state.loadData);
  const isInitialized = useStore(state => state.isInitialized);
  const themeMode = useStore(state => state.themeMode);
  const setThemeMode = useStore(state => state.setThemeMode);
  const systemScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize database
        await db.initialize();
        
        // Request notification permissions
        await NotificationService.requestPermissions();
        
        // Load app data
        await loadData();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Toast.show({
          type: 'error',
          text1: 'Initialization Error',
          text2: 'Failed to load app data. Please restart.',
        });
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const handleMockData = async () => {
    const gen = useStore.getState().generateMockData;
    await gen();
    Toast.show({ type: 'success', text1: 'Mock Data Added', text2: '90 days of sample sessions created' });
  };

  const effectiveIsDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const handleThemeToggle = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <ThemeProvider theme={effectiveIsDark ? darkTheme : theme}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.mainBackground }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="body" color="secondaryText" marginTop="m">
              Loading...
            </Text>
          </View>
          <StatusBar style={effectiveIsDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={effectiveIsDark ? darkTheme : theme}>
          <AppNavigator />
          <FAB onPress={handleMockData} />
          <Toast config={toastConfig} />
          <StatusBar style={effectiveIsDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
