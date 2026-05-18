const API_BASE_URL = 'http://10.0.0.115:5249';

import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type EventAssignment = {
  memberName: string;
  task: string;
};

export type Event = {
  id: string;
  familyGroupId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  dressCode?: string;
  notes?: string;
  createdByMemberId?: string;
  creatorDisplayName?: string;
  createdAt: string;
  assignments?: EventAssignment[];
};

export type CreateEventRequest = {
  familyGroupId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  dressCode?: string;
  notes?: string;
};

export type UpdateEventRequest = {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  dressCode?: string;
  notes?: string;
};

async function getEventHeaders(): Promise<Record<string, string>> {
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

function mapEvent(payload: unknown): Event {
  const event = (payload ?? {}) as {
    id?: string;
    familyGroupId?: string;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    location?: string;
    dressCode?: string;
    notes?: string;
    createdByMemberId?: string;
    creatorDisplayName?: string;
    createdAt?: string;
    assignments?: unknown[];
  };

  const mappedAssignments: EventAssignment[] = [];
  if (Array.isArray(event.assignments)) {
    for (const assignment of event.assignments) {
      if (assignment && typeof assignment === 'object') {
        const a = assignment as { memberName?: string; task?: string };
        if (a.memberName && a.task) {
          mappedAssignments.push({
            memberName: String(a.memberName),
            task: String(a.task),
          });
        }
      }
    }
  }

  return {
    id: String(event.id ?? ''),
    familyGroupId: String(event.familyGroupId ?? ''),
    title: String(event.title ?? ''),
    description: event.description,
    startDate: String(event.startDate ?? ''),
    endDate: event.endDate,
    location: event.location,
    dressCode: event.dressCode,
    notes: event.notes,
    createdByMemberId: event.createdByMemberId,
    creatorDisplayName: event.creatorDisplayName,
    createdAt: String(event.createdAt ?? ''),
    assignments: mappedAssignments.length > 0 ? mappedAssignments : undefined,
  };
}

export async function getEventsByGroup(groupId: string): Promise<Event[]> {
  let response: Response;
  const headers = await getEventHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/events/group/${groupId}`, {
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

  return parsedBody.map(mapEvent);
}

export async function createEvent(request: CreateEventRequest): Promise<Event> {
  let response: Response;
  const headers = await getEventHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/events`, {
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


  return mapEvent(parsedBody);
}

export async function getEventById(eventId: string): Promise<Event> {
  let response: Response;
  const headers = await getEventHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
      method: 'GET',
      headers,
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

  return mapEvent(parsedBody);
}

export async function updateEvent(eventId: string, updates: UpdateEventRequest): Promise<Event> {
  const headers = await getEventHeaders();
  headers['Content-Type'] = 'application/json';

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  const rawBody = await response.text();

  let parsedBody: unknown = {};
  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      throw new Error('Invalid server response.');
    }
  }

  if (!response.ok) {
    const serverMessage = extractServerMessage(parsedBody);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }

  return mapEvent(parsedBody);
}
