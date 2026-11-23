function extractMessage(payload) {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';
  return typeof payload.message === 'string' ? payload.message : '';
}

function deletionError(status, message) {
  if (status === 400) {
    return message || 'Type DELETE exactly to confirm account deletion.';
  }

  if (status === 401) {
    return message === 'The password is incorrect.'
      ? 'The password you entered is incorrect.'
      : 'Your sign-in has expired. Sign in again before deleting your account.';
  }

  if (status === 403) {
    return message || 'This account cannot be deleted.';
  }

  if (status === 409) {
    return message || 'Assign another community administrator before deleting your account.';
  }

  if (status >= 500) {
    return 'The server is unavailable. Please try again later.';
  }

  return message || 'Unable to delete your account. Please try again.';
}

async function requestAccountDeletion({
  apiBaseUrl,
  authToken,
  password,
  fetchImpl = globalThis.fetch,
}) {
  if (!authToken) {
    throw new Error('Your sign-in has expired. Sign in again before deleting your account.');
  }

  let response;
  try {
    response = await fetchImpl(`${apiBaseUrl}/api/account`, {
      method: 'DELETE',
      headers: {
        Authorization: ['Bearer', authToken].join(' '),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ password, confirmation: 'DELETE' }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Error responses may have an empty or non-JSON body.
  }

  if (!response.ok) {
    throw new Error(deletionError(response.status, extractMessage(payload)));
  }

  if (payload?.status !== 'deleted') {
    throw new Error('The server returned an unexpected response. Your account was not confirmed deleted.');
  }
}

async function submitAccountDeletion({
  lock,
  password,
  confirmation,
  requestDeletion,
  clearActiveGroup,
  clearSession,
  clearPreferences,
  setProcessing,
  onSuccess,
}) {
  if (lock.current) return false;
  if (!password) throw new Error('Enter your current password to continue.');
  if (confirmation !== 'DELETE') throw new Error('Type DELETE exactly to confirm account deletion.');

  lock.current = true;
  try {
    setProcessing(true);
    const userId = await requestDeletion(password);
    const activeGroupCleanup = await Promise.allSettled([clearActiveGroup()]);
    const localCleanup = await Promise.allSettled([
      clearSession(),
      clearPreferences(userId),
    ]);
    const cleanupSucceeded = [...activeGroupCleanup, ...localCleanup].every(
      (result) => result.status === 'fulfilled',
    );
    await onSuccess({ cleanupSucceeded });
    return true;
  } finally {
    lock.current = false;
    setProcessing(false);
  }
}

module.exports = { requestAccountDeletion, submitAccountDeletion };
