import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { loadSession } from '@/services/sessionService';

export const NOTIFICATION_PREFERENCE_CATEGORIES = [
  {
    key: 'Events',
    title: 'Events',
    description: 'Updates when community events are created.',
  },
  {
    key: 'Kickbacks',
    title: 'Kickbacks',
    description: 'Updates about Kickbacks and their responses.',
  },
  {
    key: 'Groups',
    title: 'Group activity',
    description: 'Updates when someone joins a community.',
  },
  {
    key: 'Polls',
    title: 'Polls',
    description: 'Updates when polls are created or voted on.',
  },
  {
    key: 'Announcements',
    title: 'Announcements',
    description: 'Updates when community announcements are posted.',
  },
] as const;

export type NotificationPreferenceCategory =
  (typeof NOTIFICATION_PREFERENCE_CATEGORIES)[number]['key'];
export type NotificationPreferences = Record<NotificationPreferenceCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  Events: true,
  Kickbacks: true,
  Groups: true,
  Polls: true,
  Announcements: true,
};

function getStorageKey(userId: string): string {
  return `notification_preferences_${userId}`;
}

async function getPreferenceValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setPreferenceValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export function getNotificationPreferenceCategory(
  activityType: string,
): NotificationPreferenceCategory | null {
  if (activityType.startsWith('Event')) return 'Events';
  if (activityType.startsWith('Kickback')) return 'Kickbacks';
  if (activityType === 'MemberJoined' || activityType === 'GroupCreated') return 'Groups';
  if (activityType.startsWith('Poll')) return 'Polls';
  if (activityType.startsWith('Announcement')) return 'Announcements';
  return null;
}

function normalizePreferences(value: unknown): NotificationPreferences {
  const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (typeof value !== 'object' || value === null) {
    return preferences;
  }

  for (const { key } of NOTIFICATION_PREFERENCE_CATEGORIES) {
    const enabled = (value as Record<string, unknown>)[key];
    if (typeof enabled === 'boolean') {
      preferences[key] = enabled;
    }
  }

  return preferences;
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  const session = await loadSession();
  if (!session?.userId) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  const stored = await getPreferenceValue(getStorageKey(session.userId));
  if (!stored) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  try {
    return normalizePreferences(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  const session = await loadSession();
  if (!session?.userId) {
    throw new Error('Sign in to save notification preferences.');
  }

  await setPreferenceValue(
    getStorageKey(session.userId),
    JSON.stringify(normalizePreferences(preferences)),
  );
}
