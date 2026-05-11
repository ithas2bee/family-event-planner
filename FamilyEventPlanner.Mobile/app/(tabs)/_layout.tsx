import { Stack } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Stack>
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
    </Stack>
  );
}
