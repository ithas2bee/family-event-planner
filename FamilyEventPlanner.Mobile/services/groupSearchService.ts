import { API_BASE_URL } from '@/config/api';

export type GroupSearchResult = {
  groupId: string;
  groupName: string;
  groupType: string;
  isInviteOnly: boolean;
  accessMode: 'InviteOnlySearchable' | 'CommunitySearchableRequestToJoin';
};

export async function searchGroups(
  query: string,
  authToken: string | null,
  memberId?: string,
): Promise<GroupSearchResult[]> {
  if (!authToken && !memberId) {
    throw new Error('Please sign in again to search for groups.');
  }

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/familygroups/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: 'application/json',
          ...(authToken ? { Authorization: ['Bearer', authToken].join(' ') } : {}),
          ...(memberId ? { 'X-Member-Id': memberId } : {}),
        },
      },
    );
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Please sign in again to search for groups.');
    }
    throw new Error('Could not search groups. Please try again.');
  }

  return response.json() as Promise<GroupSearchResult[]>;
}
