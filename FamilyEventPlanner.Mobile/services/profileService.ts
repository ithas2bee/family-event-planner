import { API_BASE_URL } from '@/config/api';
import { loadSession } from '@/services/sessionService';

export const PROFILE_ROLES = ['Mom', 'Dad', 'Aunt', 'Uncle', 'Cousin', 'Grandparent', 'Sibling', 'Friend', 'Other'] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export type Profile = {
  name: string | null;
  email: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
  roles: string[];
  familyNames: string[];
};

export type ProfileUpdate = Omit<Profile, 'email' | 'familyNames'>;

async function profileRequest<T>(method: 'GET' | 'PUT', body?: ProfileUpdate): Promise<T> {
  const session = await loadSession();
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.authToken ? { Authorization: ['Bearer', session.authToken].join(' ') } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? 'Unable to load your profile.');
  }

  return payload as T;
}

export function getProfile(): Promise<Profile> {
  return profileRequest<Profile>('GET');
}

export function updateProfile(profile: ProfileUpdate): Promise<Profile> {
  return profileRequest<Profile>('PUT', profile);
}
