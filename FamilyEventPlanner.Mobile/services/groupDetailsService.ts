import { API_BASE_URL } from '@/config/api';

import type { GroupMember } from './groupMemberService';

export type GroupDetails = {
  groupId: string;
  groupName: string;
  groupType: string;
  description: string | null;
  isInviteOnly: boolean;
  isSearchable: boolean;
  memberCount: number;
  isAdmin: boolean;
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
