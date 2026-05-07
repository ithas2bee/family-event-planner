import { loadSession } from '@/services/sessionService';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await loadSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (session?.authToken) {
    headers['Authorization'] = `Bearer ${session.authToken}`;
  }

  return headers;
}
