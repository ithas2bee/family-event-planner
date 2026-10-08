import { API_BASE_URL } from '@/config/api';

export async function deleteCommunityContent(
  contentType: 'events' | 'kickbacks' | 'polls' | 'announcements',
  contentId: string,
  headers: Record<string, string>,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/${contentType}/${contentId}`, {
      method: 'DELETE',
      headers,
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (response.ok) return;

  let message = '';
  try {
    const payload = await response.json();
    message = payload?.message ?? payload?.title ?? '';
  } catch {
    // Ignore non-JSON error responses.
  }

  throw new Error(message || `Unable to delete this item (error ${response.status}).`);
}
