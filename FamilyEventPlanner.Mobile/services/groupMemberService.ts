// ─────────────────────────────────────────────────────────────────────────────
// API base URL
//
// Do NOT use "localhost" in a React Native / Expo app.
// On a physical device, "localhost" refers to the device itself, not your PC.
// Use the actual local IP address of the machine running your ASP.NET backend.
// Change this value to match your machine's IP address and port.
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://10.0.0.115:5249';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// The JSON body sent to POST /api/groupmembers/join
export type JoinGroupRequest = {
  inviteCode: string;
  name: string;
  email: string;
};

// The JSON shape returned by the backend on success.
// Extend this as you learn what your ASP.NET API actually returns.
export type JoinGroupResponse = {
  memberId?: string;
  groupId?: string;
  groupName?: string;
  memberName?: string;
  email?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Maps a non-OK HTTP status code to a friendly message shown to the user.
function resolveErrorMessage(status: number, serverMessage: string): string {
  if (status === 400) {
    // The server said the request was malformed.
    // Try to use the server's own message first; fall back to a generic one.
    if (serverMessage.toLowerCase().includes('invite')) {
      return 'Invalid invite code. Please check and try again.';
    }
    if (serverMessage.toLowerCase().includes('member')) {
      return 'You are already a member of this family group.';
    }
    return serverMessage || 'The request was invalid. Please check your details.';
  }

  if (status === 404) {
    return 'Family group not found. Double-check your invite code.';
  }

  if (status === 409) {
    return 'You are already a member of this family group.';
  }

  if (status >= 500) {
    return 'The server is unavailable. Please try again later.';
  }

  return `Something went wrong (error ${status}). Please try again.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main service function
// ─────────────────────────────────────────────────────────────────────────────

// Calls POST /api/groupmembers/join and returns the parsed response.
// Throws a plain Error with a user-friendly message if anything goes wrong.
export async function joinFamilyGroup(request: JoinGroupRequest): Promise<JoinGroupResponse> {
  let response: Response;

  try {
    // fetch() is built into React Native — no extra package needed.
    response = await fetch(`${API_BASE_URL}/api/groupmembers/join`, {
      method: 'POST',
      headers: {
        // Tell the server we are sending JSON.
        'Content-Type': 'application/json',
        // Tell the server we want JSON back.
        Accept: 'application/json',
      },
      // JSON.stringify converts the JS object into a JSON string for the body.
      body: JSON.stringify(request),
    });
  } catch {
    // fetch itself threw — this means no network connection at all.
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (!response.ok) {
    // The server replied, but with a non-2xx status (e.g. 400, 404, 500).
    // Try to read the response body for a server-provided error message.
    let serverMessage = '';
    try {
      const errorBody = await response.json();
      // ASP.NET validation errors arrive as { errors: { field: [msg] } }
      // or a plain { message: "..." }. Try both shapes.
      serverMessage =
        errorBody?.message ??
        errorBody?.title ??
        Object.values(errorBody?.errors ?? {}).flat().join(' ') ??
        '';
    } catch {
      // Response body was not valid JSON — ignore and use status-based message.
    }

    throw new Error(resolveErrorMessage(response.status, serverMessage));
  }

  const data: JoinGroupResponse = await response.json();
  return data;
}

export type GroupMember = {
  id?: number;
  name?: string;
  email?: string;
  isAdmin?: boolean;
};

export async function getGroupMembers(groupId: string, memberId: string): Promise<GroupMember[]> {
  let response: Response;
  const url = `${API_BASE_URL}/api/GroupMembers/${groupId}`;
  const headers = {
    Accept: 'application/json',
    'X-Member-Id': memberId,
  };

  console.log('groupId', groupId);
  console.log('memberId', memberId);
  console.log('headers', { 'X-Member-Id': memberId });
  console.log('final fetch URL', url);

  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
    });
  } catch {
    throw new Error('Could not reach the server. Check your network connection.');
  }

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('The server is unavailable. Please try again later.');
    }
    throw new Error(`Failed to load members (error ${response.status}).`);
  }

  const data: GroupMember[] = await response.json();
  return data;
}
