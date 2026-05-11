const API_BASE_URL = 'http://10.0.0.115:5249';

import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type PollOption = {
  id: string;
  text: string;
  voteCount: number;
};

export type Poll = {
  id: string;
  familyGroupId: string;
  familyEventId?: string;
  question: string;
  createdByMemberId?: string;
  creatorDisplayName?: string;
  createdAt: string;
  currentMemberSelectedOptionId?: string;
  options: PollOption[];
};

async function getPollHeaders(): Promise<Record<string, string>> {
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

function mapPollOption(payload: unknown): PollOption {
  const option = (payload ?? {}) as {
    id?: string;
    text?: string;
    voteCount?: number;
  };

  return {
    id: String(option.id ?? ''),
    text: String(option.text ?? ''),
    voteCount: Number(option.voteCount ?? 0),
  };
}

function mapPoll(payload: unknown): Poll {
  const poll = (payload ?? {}) as {
    id?: string;
    familyGroupId?: string;
    familyEventId?: string;
    question?: string;
    createdByMemberId?: string;
    creatorDisplayName?: string;
    createdAt?: string;
    currentMemberSelectedOptionId?: string;
    options?: unknown[];
  };

  return {
    id: String(poll.id ?? ''),
    familyGroupId: String(poll.familyGroupId ?? ''),
    familyEventId: poll.familyEventId != null ? String(poll.familyEventId) : undefined,
    question: String(poll.question ?? ''),
    createdByMemberId: poll.createdByMemberId != null ? String(poll.createdByMemberId) : undefined,
    creatorDisplayName: poll.creatorDisplayName != null ? String(poll.creatorDisplayName) : undefined,
    createdAt: String(poll.createdAt ?? ''),
    currentMemberSelectedOptionId:
      poll.currentMemberSelectedOptionId != null
        ? String(poll.currentMemberSelectedOptionId)
        : undefined,
    options: Array.isArray(poll.options) ? poll.options.map(mapPollOption) : [],
  };
}

export async function getPollsByGroup(groupId: string): Promise<Poll[]> {
  const headers = await getPollHeaders();

  const response = await fetch(`${API_BASE_URL}/api/polls/group/${groupId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // ignore parse failure
    }

    const serverMessage = extractServerMessage(payload);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }

  const data: unknown = await response.json();
  const items = Array.isArray(data) ? data : [];
  return items.map(mapPoll);
}

export type CreatePollRequest = {
  familyGroupId: string;
  question: string;
  options: string[];
  familyEventId?: string;
};

export async function createPoll(request: CreatePollRequest): Promise<void> {
  const headers = await getPollHeaders();

  const response = await fetch(`${API_BASE_URL}/api/polls`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // ignore parse failure
    }

    const serverMessage = extractServerMessage(payload);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }
}

export async function voteOnPoll(pollOptionId: string): Promise<void> {
  const headers = await getPollHeaders();

  const response = await fetch(`${API_BASE_URL}/api/polls/vote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ pollOptionId }),
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // ignore parse failure
    }

    const serverMessage = extractServerMessage(payload);
    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }
}
