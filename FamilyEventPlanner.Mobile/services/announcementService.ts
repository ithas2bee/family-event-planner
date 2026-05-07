const API_BASE_URL = 'http://10.0.0.115:5249';

import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type Announcement = {
  id: string;
  familyGroupId: string;
  title: string;
  body: string;
  createdByMemberId?: string;
  creatorDisplayName?: string;
  createdAt: string;
  expiresAt?: string;
};

export type CreateAnnouncementRequest = {
  familyGroupId: string;
  title: string;
  body: string;
  expiresAt?: string;
};

async function getAnnouncementHeaders(): Promise<Record<string, string>> {
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

function mapAnnouncement(payload: unknown): Announcement {
  const announcement = (payload ?? {}) as {
    id?: string;
    familyGroupId?: string;
    title?: string;
    body?: string;
    createdByMemberId?: string;
    creatorDisplayName?: string;
    createdAt?: string;
    expiresAt?: string;
  };

  return {
    id: String(announcement.id ?? ''),
    familyGroupId: String(announcement.familyGroupId ?? ''),
    title: String(announcement.title ?? ''),
    body: String(announcement.body ?? ''),
    createdByMemberId: announcement.createdByMemberId,
    creatorDisplayName: announcement.creatorDisplayName,
    createdAt: String(announcement.createdAt ?? ''),
    expiresAt: announcement.expiresAt,
  };
}

export async function getAnnouncementsByGroup(groupId: string): Promise<Announcement[]> {
  let response: Response;
  const headers = await getAnnouncementHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/announcements/group/${groupId}`, {
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
    .map(mapAnnouncement)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createAnnouncement(request: CreateAnnouncementRequest): Promise<Announcement> {
  let response: Response;
  const headers = await getAnnouncementHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/announcements`, {
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

  return mapAnnouncement(parsedBody);
}