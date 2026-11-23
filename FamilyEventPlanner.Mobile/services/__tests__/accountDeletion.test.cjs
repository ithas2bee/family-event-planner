const assert = require('node:assert/strict');
const test = require('node:test');
const {
  requestAccountDeletion,
  submitAccountDeletion,
} = require('../account-deletion.js');

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

test('deletion sends only the authenticated account request and exact API body', async () => {
  let request;
  await requestAccountDeletion({
    apiBaseUrl: 'https://api-dev.huddleupmobileapp.com',
    authToken: 'jwt-token',
    password: 'current-password',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response(200, { status: 'deleted' });
    },
  });

  assert.equal(request.url, 'https://api-dev.huddleupmobileapp.com/api/account');
  assert.equal(request.options.method, 'DELETE');
  assert.equal(request.options.headers.Authorization, ['Bearer', 'jwt-token'].join(' '));
  assert.equal(request.options.headers.Accept, 'application/json');
  assert.deepEqual(JSON.parse(request.options.body), {
    password: 'current-password',
    confirmation: 'DELETE',
  });
  assert.doesNotMatch(request.options.body, /userId|memberId/);
});

test('incorrect password, expired authentication, and last-admin errors are accurate', async () => {
  for (const [status, payload, expected] of [
    [400, { message: 'Type DELETE to confirm account deletion.' }, /Type DELETE to confirm/],
    [401, { message: 'The password is incorrect.' }, /password you entered is incorrect/],
    [401, { message: 'Unauthorized' }, /sign-in has expired/],
    [403, {}, /This account cannot be deleted/],
    [409, { message: 'Assign another community administrator before deleting your account.' }, /another community administrator/],
  ]) {
    await assert.rejects(
      requestAccountDeletion({
        apiBaseUrl: 'https://api-dev.huddleupmobileapp.com',
        authToken: 'jwt-token',
        password: 'current-password',
        fetchImpl: async () => response(status, payload),
      }),
      expected,
    );
  }
});

test('network and server failures do not report deletion success', async () => {
  await assert.rejects(
    requestAccountDeletion({
      apiBaseUrl: 'https://api-dev.huddleupmobileapp.com',
      authToken: 'jwt-token',
      password: 'current-password',
      fetchImpl: async () => { throw new Error('offline'); },
    }),
    /Could not reach the server/,
  );
  await assert.rejects(
    requestAccountDeletion({
      apiBaseUrl: 'https://api-dev.huddleupmobileapp.com',
      authToken: 'jwt-token',
      password: 'current-password',
      fetchImpl: async () => response(503, { message: 'secret server detail' }),
    }),
    /server is unavailable/,
  );
  await assert.rejects(
    requestAccountDeletion({
      apiBaseUrl: 'https://api-dev.huddleupmobileapp.com',
      authToken: 'jwt-token',
      password: 'current-password',
      fetchImpl: async () => response(200, { status: 'pending' }),
    }),
    /not confirmed deleted/,
  );
});

test('invalid confirmation is rejected before the API request', async () => {
  let calls = 0;
  const options = {
    lock: { current: false },
    password: 'current-password',
    confirmation: 'delete',
    requestDeletion: async () => { calls += 1; return 'user-1'; },
    clearActiveGroup: async () => {},
    clearSession: async () => {},
    clearPreferences: async () => {},
    setProcessing: () => {},
    onSuccess: () => {},
  };

  await assert.rejects(submitAccountDeletion(options), /Type DELETE exactly/);
  assert.equal(calls, 0);
  assert.equal(options.lock.current, false);
});

test('duplicate submissions are prevented and success clears local user state', async () => {
  let releaseRequest;
  let requestCalls = 0;
  const cleaned = [];
  const lock = { current: false };
  const options = {
    lock,
    password: 'current-password',
    confirmation: 'DELETE',
    requestDeletion: async () => {
      requestCalls += 1;
      await new Promise((resolve) => { releaseRequest = resolve; });
      return 'user-1';
    },
    clearActiveGroup: async () => { cleaned.push('active-group'); },
    clearSession: async () => { cleaned.push('session'); },
    clearPreferences: async (userId) => { cleaned.push(`preferences:${userId}`); },
    setProcessing: () => {},
    onSuccess: () => { cleaned.push('success'); },
  };

  const first = submitAccountDeletion(options);
  assert.equal(await submitAccountDeletion(options), false);
  assert.equal(requestCalls, 1);
  releaseRequest();
  assert.equal(await first, true);
  assert.deepEqual(cleaned.sort(), ['active-group', 'preferences:user-1', 'session', 'success']);
  assert.equal(lock.current, false);
});

test('failed API deletion leaves local credentials and user data intact', async () => {
  const cleaned = [];
  await assert.rejects(submitAccountDeletion({
    lock: { current: false },
    password: 'current-password',
    confirmation: 'DELETE',
    requestDeletion: async () => { throw new Error('Wrong password'); },
    clearActiveGroup: async () => { cleaned.push('active-group'); },
    clearSession: async () => { cleaned.push('session'); },
    clearPreferences: async () => { cleaned.push('preferences'); },
    setProcessing: () => {},
    onSuccess: () => { cleaned.push('success'); },
  }), /Wrong password/);
  assert.deepEqual(cleaned, []);
});
