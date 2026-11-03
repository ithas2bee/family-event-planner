import { API_BASE_URL } from '@/config/api';

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
