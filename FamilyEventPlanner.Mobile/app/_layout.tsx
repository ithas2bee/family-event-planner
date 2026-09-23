import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ActiveGroupProvider, useActiveGroupContext } from '@/contexts/active-group-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ActiveGroupProvider>
        <NavigationGate />
      </ActiveGroupProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const unrestrictedRoutes = new Set([
  'index',
  'auth',
  'login',
  'create-account',
  'group-required',
  'my-groups',
  'join-group',
  'create-group',
]);

function NavigationGate() {
  const segments = useSegments();
  const { isReady, isAuthenticated, isResolvingGroups, hasGroups } = useActiveGroupContext();

  useEffect(() => {
    const currentRoute = segments[segments.length - 1];
    if (
      !isReady ||
      !isAuthenticated ||
      isResolvingGroups ||
      hasGroups ||
      (currentRoute !== undefined && unrestrictedRoutes.has(currentRoute))
    ) {
      return;
    }

    router.replace('/group-required');
  }, [hasGroups, isAuthenticated, isReady, isResolvingGroups, segments]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="create-account" options={{ title: 'Create Account' }} />
      <Stack.Screen name="group-required" options={{ headerShown: false }} />
      <Stack.Screen name="my-groups" options={{ headerShown: false }} />
      <Stack.Screen name="join-group" options={{ title: 'Join a Group' }} />
      <Stack.Screen name="create-group" options={{ title: 'Create a Group' }} />
      <Stack.Screen name="create-event" options={{ headerShown: false }} />
      <Stack.Screen name="create-announcement" options={{ headerShown: false }} />
      <Stack.Screen name="announcement/[announcementId]" options={{ headerShown: false }} />
      <Stack.Screen name="create-poll" options={{ headerShown: false }} />
      <Stack.Screen name="poll/[pollId]" options={{ headerShown: false }} />
      <Stack.Screen name="create-kickback" options={{ headerShown: false }} />
      <Stack.Screen name="event/[eventId]" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="help-support" options={{ headerShown: false }} />
      <Stack.Screen name="under-construction" options={{ headerShown: false }} />
    </Stack>
  );
}
