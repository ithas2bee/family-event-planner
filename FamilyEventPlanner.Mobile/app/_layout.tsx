import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="create-account" options={{ title: 'Create Account' }} />
        <Stack.Screen name="join-group" options={{ title: 'Join a Group' }} />
        <Stack.Screen name="create-group" options={{ title: 'Create a Group' }} />
        <Stack.Screen name="create-event" options={{ title: 'Create Event' }} />
        <Stack.Screen name="announcements" options={{ title: 'Announcements' }} />
        <Stack.Screen name="create-announcement" options={{ title: 'Create Announcement' }} />
        <Stack.Screen name="my-groups" options={{ headerShown: false }} />
        <Stack.Screen name="family-home" options={{ title: 'Family Home' }} />
        <Stack.Screen name="members" options={{ title: 'Members' }} />
        <Stack.Screen name="events" options={{ title: 'Family Events' }} />
        <Stack.Screen name="polls" options={{ title: 'Polls' }} />
        <Stack.Screen name="create-poll" options={{ title: 'Create Poll' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
