const API_BASE_URL = 'http://10.0.0.115:5249';

import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type KickbackResponseType = 'PullingUp' | 'Maybe';

export type Kickback = {
  id: string;
  familyGroupId: string;
  createdByMemberId?: string;
  creatorDisplayName?: string;
  vibe: string;
  note?: string;
  expiresAtUtc: string;
  createdAtUtc: string;
  isActive: boolean;
  pullingUpCount: number;
  maybeCount: number;
  currentMemberResponse?: KickbackResponseType | null;
};

export type CreateKickbackRequest = {
  familyGroupId: string;
  vibe: string;
  note?: string;
  expiresAtUtc: string;
};

export type RespondToKickbackRequest = {
  kickbackId: string;
  responseType: KickbackResponseType;
};

async function getKickbackHeaders(): Promise<Record<string, string>> {
  const headers = await getAuthHeaders();
  const session = await loadSession();

  if (session?.memberId) {
    headers['X-Member-Id'] = session.memberId;
  }

  return headers;
}

function resolveErrorMessage(status: number, serverMessage: string): string {
  if (status === 404) {
    return 'Family group not found.';
  }

  if (status >= 500) {
    return 'The server is unavailable. Please try again later.';
  }

  return serverMessage || `Something went wrong (error ${status}). Please try again.`;
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

function mapKickback(payload: unknown): Kickback {
  const kickback = (payload ?? {}) as {
    id?: string;
    familyGroupId?: string;
    createdByMemberId?: string;
    creatorDisplayName?: string;
    vibe?: string;
    note?: string;
    expiresAtUtc?: string;
    createdAtUtc?: string;
    isActive?: boolean;
    pullingUpCount?: number;
    maybeCount?: number;
    currentMemberResponse?: KickbackResponseType | null;
  };

  return {
    id: String(kickback.id ?? ''),
    familyGroupId: String(kickback.familyGroupId ?? ''),
    createdByMemberId:
      kickback.createdByMemberId != null ? String(kickback.createdByMemberId) : undefined,
    creatorDisplayName:
      kickback.creatorDisplayName != null ? String(kickback.creatorDisplayName) : undefined,
    vibe: String(kickback.vibe ?? ''),
    note: kickback.note != null ? String(kickback.note) : undefined,
    expiresAtUtc: String(kickback.expiresAtUtc ?? ''),
    createdAtUtc: String(kickback.createdAtUtc ?? ''),
    isActive: Boolean(kickback.isActive),
    pullingUpCount: Number(kickback.pullingUpCount ?? 0),
    maybeCount: Number(kickback.maybeCount ?? 0),
    currentMemberResponse: kickback.currentMemberResponse ?? null,
  };
}

export async function getKickbacksByGroup(groupId: string): Promise<Kickback[]> {
  let response: Response;
  const headers = await getKickbackHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/kickbacks/group/${groupId}`, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  const rawBody = await response.text();

  let parsedBody: unknown = [];
  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = [];
    }
  }

  if (!response.ok) {
    const serverMessage = extractServerMessage(parsedBody);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }

  if (!Array.isArray(parsedBody)) {
    return [];
  }

  return parsedBody
    .map(mapKickback)
    .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
}

export async function createKickback(request: CreateKickbackRequest): Promise<Kickback> {
  let response: Response;
  const headers = await getKickbackHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/kickbacks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  const rawBody = await response.text();

  let parsedBody: unknown = null;
  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const serverMessage = extractServerMessage(parsedBody);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }

  if (!parsedBody || typeof parsedBody !== 'object') {
    throw new Error('The server returned an unexpected response.');
  }

  return mapKickback(parsedBody);
}

export async function respondToKickback(request: RespondToKickbackRequest): Promise<void> {
  let response: Response;
  const headers = await getKickbackHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/kickbacks/respond`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  const rawBody = await response.text();

  let parsedBody: unknown = null;
  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const serverMessage = extractServerMessage(parsedBody);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }
}
