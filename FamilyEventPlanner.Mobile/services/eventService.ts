const API_BASE_URL = 'http://10.0.0.115:5249';

export type FamilyEvent = {
  id?: string;
  eventId?: string;
  title?: string;
  name?: string;
  eventTitle?: string;
  startDate?: string;
  startsAt?: string;
  eventDate?: string;
};

export async function getGroupEvents(groupId: string, memberId: string): Promise<FamilyEvent[]> {
  let response: Response;
  const url = `${API_BASE_URL}/api/Events/group/${groupId}`;
  const headers = {
    Accept: 'application/json',
    'X-Member-Id': memberId,
  };

  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('The server is unavailable. Please try again later.');
    }
    throw new Error(`Failed to load events (error ${response.status}).`);
  }

  const data: FamilyEvent[] = await response.json();
  return data;
}
