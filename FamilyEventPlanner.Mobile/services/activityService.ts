const API_BASE_URL = 'http://10.0.0.115:5249';

import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type ActivityFeedItem = {
  id: string;
  familyGroupId: string;
  actorMemberId?: string;
  actorDisplayName?: string;
  message?: string;
  activityType: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadataJson?: string;
  createdAtUtc: string;
};

async function getActivityHeaders(): Promise<Record<string, string>> {
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

function mapActivity(payload: unknown): ActivityFeedItem {
  const activity = (payload ?? {}) as {
    id?: string;
    familyGroupId?: string;
    actorMemberId?: string;
    actorDisplayName?: string;
    message?: string;
    activityType?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    metadataJson?: string;
    createdAtUtc?: string;
  };

  return {
    id: String(activity.id ?? ''),
    familyGroupId: String(activity.familyGroupId ?? ''),
    actorMemberId: activity.actorMemberId != null ? String(activity.actorMemberId) : undefined,
    actorDisplayName:
      activity.actorDisplayName != null ? String(activity.actorDisplayName) : undefined,
    message: activity.message != null ? String(activity.message) : undefined,
    activityType: String(activity.activityType ?? ''),
    relatedEntityId:
      activity.relatedEntityId != null ? String(activity.relatedEntityId) : undefined,
    relatedEntityType:
      activity.relatedEntityType != null ? String(activity.relatedEntityType) : undefined,
    metadataJson: activity.metadataJson != null ? String(activity.metadataJson) : undefined,
    createdAtUtc: String(activity.createdAtUtc ?? ''),
  };
}

export async function getActivityByGroup(groupId: string): Promise<ActivityFeedItem[]> {
  let response: Response;
  const headers = await getActivityHeaders();

  try {
    response = await fetch(`${API_BASE_URL}/api/activity/group/${groupId}`, {
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
    .map(mapActivity)
    .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime());
}
