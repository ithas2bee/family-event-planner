import { API_BASE_URL } from '@/config/api';
import { loadSession } from '@/services/sessionService';

export type Profile = {
  name: string | null;
  email: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  profilePictureUrl: string | null;
  roles: string[];
  familyNames: string[];
  communities: ProfileRoleGroup[];
};

export type ProfileRoleOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

export type ProfileRoleGroup = {
  groupId: string;
  communityName: string;
  roles: string[];
  selectedRoleIds?: string[];
  availableRoles?: ProfileRoleOption[];
};

export type MemberProfile = Omit<Profile, 'email' | 'roles' | 'familyNames'> & {
  isOwnProfile: boolean;
};

export type ProfileUpdate = Omit<Profile, 'email' | 'familyNames' | 'roles' | 'communities'> & {
  communityRoles: { groupId: string; roleIds: string[] }[];
};

async function profileRequest<T>(method: 'GET' | 'PUT', body?: ProfileUpdate, path = '/api/profile'): Promise<T> {
  const session = await loadSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export function getCommunityMemberProfile(groupId: string, memberId: string): Promise<MemberProfile> {
  return profileRequest<MemberProfile>(
    'GET',
    undefined,
    `/api/profile/communities/${groupId}/members/${memberId}`,
  );
}
