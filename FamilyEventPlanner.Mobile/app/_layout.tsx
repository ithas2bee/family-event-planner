import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ActiveGroupProvider } from '@/contexts/active-group-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ActiveGroupProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Login' }} />
          <Stack.Screen name="create-account" options={{ title: 'Create Account' }} />
          <Stack.Screen name="join-group" options={{ title: 'Join a Group' }} />
          <Stack.Screen name="create-group" options={{ title: 'Create a Group' }} />
          <Stack.Screen name="create-event" options={{ title: 'Create Event' }} />
          <Stack.Screen name="create-announcement" options={{ title: 'Create Announcement' }} />
          <Stack.Screen name="create-poll" options={{ title: 'Create Poll' }} />
          <Stack.Screen name="create-kickback" options={{ title: 'Create Kickback' }} />
        </Stack>
      </ActiveGroupProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
