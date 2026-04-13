import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'app_session';

export type AppSession = {
  userId: string;
  displayName: string;
  email: string;
  memberId?: string;
  groupId?: string;
  memberName?: string;
  groupName?: string;
  isAdmin?: boolean;
  authToken: string | null;
};

async function setSessionValue(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(SESSION_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function getSessionValue(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(SESSION_KEY);
  }

  return SecureStore.getItemAsync(SESSION_KEY);
}

async function deleteSessionValue(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function saveSession(session: AppSession): Promise<void> {
  await setSessionValue(JSON.stringify(session));
}

export async function loadSession(): Promise<AppSession | null> {
  const raw = await getSessionValue();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await deleteSessionValue();
}
