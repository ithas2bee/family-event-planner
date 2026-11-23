import { API_BASE_URL } from '@/config/api';
import { loadSession } from '@/services/sessionService';
import { requestAccountDeletion } from '@/services/account-deletion.js';

export async function deleteCurrentAccount(password: string): Promise<string> {
  const session = await loadSession();
  if (!session?.authToken || !session.userId) {
    throw new Error('Your sign-in has expired. Sign in again before deleting your account.');
  }

  await requestAccountDeletion({
    apiBaseUrl: API_BASE_URL,
    authToken: session.authToken,
    password,
  });

  return session.userId;
}
