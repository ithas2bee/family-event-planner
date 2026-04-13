const API_BASE_URL = 'http://10.0.0.115:5249';

export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthUserResponse = {
  userId: string;
  displayName: string;
  email: string;
};

function mapAuthError(status: number, fallback: string): string {
  if (status === 400) {
    return fallback || 'Please check your input and try again.';
  }

  if (status === 401) {
    return 'Invalid email or password.';
  }

  if (status === 409) {
    return 'An account with this email already exists.';
  }

  if (status >= 500) {
    return 'The server is unavailable. Please try again later.';
  }

  return fallback || `Request failed (error ${status}).`;
}

function extractServerMessage(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object') {
    const body = payload as {
      message?: string;
      title?: string;
      errors?: Record<string, unknown>;
    };

    const validationMessages = Object.values(body.errors ?? {})
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .map((entry) => String(entry ?? '').trim())
      .filter((entry) => entry.length > 0)
      .join(' ');

    return body.message ?? body.title ?? validationMessages ?? '';
  }

  return '';
}

async function postAuth<TRequest>(endpoint: string, payload: TRequest): Promise<AuthUserResponse> {
  let response: Response;
  const url = `${API_BASE_URL}${endpoint}`;
  const requestBody = JSON.stringify(payload);

  console.log('[Auth] Request', { endpoint, url, body: requestBody });

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: requestBody,
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  console.log('[Auth] Response status', { endpoint, status: response.status, ok: response.ok });

  const rawBody = await response.text();
  console.log('[Auth] Response text', { endpoint, body: rawBody });

  let parsedBody: unknown = null;
  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  console.log('[Auth] Parsed response', { endpoint, parsedBody });

  if (!response.ok) {
    const serverMessage = extractServerMessage(parsedBody);
    throw new Error(mapAuthError(response.status, serverMessage));
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    throw new Error('The server returned an unexpected response.');
  }

  const payloadObject = parsedBody as {
    userId?: string;
    id?: string;
    displayName?: string;
    email?: string;
  };

  return {
    userId: String(payloadObject.userId ?? payloadObject.id ?? ''),
    displayName: String(payloadObject.displayName ?? ''),
    email: String(payloadObject.email ?? ''),
  };
}

export async function registerUser(request: RegisterRequest): Promise<AuthUserResponse> {
  return postAuth('/api/auth/register', request);
}

export async function loginUser(request: LoginRequest): Promise<AuthUserResponse> {
  return postAuth('/api/auth/login', request);
}
