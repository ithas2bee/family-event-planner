import { API_BASE_URL } from '@/config/api';
import { loadSession } from '@/services/sessionService';

import type { GroupMember } from './groupMemberService';

export type GroupDetails = {
  groupId: string;
  groupName: string;
  groupType: string;
  description: string | null;
  isInviteOnly: boolean;
  isSearchable: boolean;
  accessMode: GroupAccessMode;
  memberCount: number;
  isAdmin: boolean;
};

export type MembershipRequest = {
  requestId: string;
  userId: string;
  displayName: string | null;
  profilePictureUrl: string | null;
  age: number | null;
  location: string | null;
  bio: string | null;
  createdAt: string;
};

export type GroupAccessMode =
  | 'InviteOnlyNotSearchable'
  | 'InviteOnlySearchable'
  | 'CommunitySearchableRequestToJoin';

export type CommunityRole = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
};

async function sendRequest<T>(url: string, memberId: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Member-Id': memberId,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (!response.ok) {
    if (response.status === 403) throw new Error('You do not have permission to manage this group.');
    if (response.status === 404) throw new Error('This group or request could not be found.');
    if (response.status === 409) throw new Error('This membership request has already been processed.');
    throw new Error(`Could not load or update group details (error ${response.status}).`);
  }

  return response.json() as Promise<T>;
}

async function sendRoleRequest<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const session = await loadSession();
  if (!session?.authToken) {
    throw new Error('Please sign in again to manage community roles.');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: ['Bearer', session.authToken].join(' '),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (response.status === 401) throw new Error('Please sign in again to manage community roles.');
  if (response.status === 403) throw new Error('You do not have permission to manage these community roles.');
  if (response.status === 404) throw new Error('This community or role could not be found.');
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? `Could not update community roles (error ${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getGroupDetails(groupId: string, memberId: string): Promise<GroupDetails> {
  return sendRequest(`${API_BASE_URL}/api/familygroups/${groupId}`, memberId);
}

export function updateGroupDescription(
  groupId: string,
  memberId: string,
  description: string,
): Promise<{ description: string | null }> {
  return sendRequest(
    `${API_BASE_URL}/api/familygroups/${groupId}/description`,
    memberId,
    'PUT',
    { description },
  );
}

export function updateGroupAccess(
  groupId: string,
  memberId: string,
  accessMode: GroupAccessMode,
): Promise<{ accessMode: GroupAccessMode; isInviteOnly: boolean; isSearchable: boolean }> {
  return sendRequest(
    `${API_BASE_URL}/api/familygroups/${groupId}/access`,
    memberId,
    'PUT',
    { accessMode },
  );
}

export function updateGroupMemberAdmin(
  groupId: string,
  targetMemberId: string,
  memberId: string,
  isAdmin: boolean,
): Promise<Pick<GroupMember, 'memberId' | 'isAdmin'>> {
  return sendRequest(
    `${API_BASE_URL}/api/groupmembers/${groupId}/${targetMemberId}/admin`,
    memberId,
    'PUT',
    { isAdmin },
  );
}

export function getCommunityRoles(groupId: string): Promise<CommunityRole[]> {
  return sendRoleRequest(`${API_BASE_URL}/api/familygroups/${groupId}/roles`);
}

export function createCommunityRole(
  groupId: string,
  name: string,
): Promise<CommunityRole> {
  return sendRoleRequest(`${API_BASE_URL}/api/familygroups/${groupId}/roles`, 'POST', { name });
}

export function updateCommunityRole(
  groupId: string,
  roleId: string,
  name: string,
): Promise<CommunityRole> {
  return sendRoleRequest(
    `${API_BASE_URL}/api/familygroups/${groupId}/roles/${roleId}`,
    'PUT',
    { name },
  );
}

export function deactivateCommunityRole(groupId: string, roleId: string): Promise<void> {
  return sendRoleRequest(
    `${API_BASE_URL}/api/familygroups/${groupId}/roles/${roleId}`,
    'DELETE',
  );
}

export function restoreCommunityRoleDefaults(groupId: string): Promise<CommunityRole[]> {
  return sendRoleRequest(`${API_BASE_URL}/api/familygroups/${groupId}/roles/defaults`, 'POST');
}

export function updateGroupMemberRole(
  groupId: string,
  targetMemberId: string,
  roleId: string | null,
): Promise<{ memberId: string; roleId: string | null; roleName: string | null }> {
  return sendRoleRequest(
    `${API_BASE_URL}/api/groupmembers/${groupId}/${targetMemberId}/role`,
    'PUT',
    { roleId },
  );
}

export function getPendingMembershipRequests(groupId: string, memberId: string): Promise<MembershipRequest[]> {
  return sendRequest(`${API_BASE_URL}/api/familygroups/${groupId}/membership-requests`, memberId);
}

export function processMembershipRequest(
  groupId: string,
  requestId: string,
  memberId: string,
  decision: 'approve' | 'reject',
): Promise<{ requestId: string; status: 'Approved' | 'Rejected'; memberId?: string }> {
  return sendRequest(
    `${API_BASE_URL}/api/familygroups/${groupId}/membership-requests/${requestId}/${decision}`,
    memberId,
    'POST',
  );
}
