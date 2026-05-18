import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MainTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="family-home"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="family-home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="plus.circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kickbacks"
        options={{
          title: 'Kickbacks',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="party.popper" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bell.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-groups"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="polls"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
