import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type AttendanceResponse = {
  id: string;
  familyEventId: string;
  memberId: string;
  rsvp: number;
};

async function attendanceHeaders() {
  const headers = await getAuthHeaders();
  const session = await loadSession();
  if (session?.memberId) headers['X-Member-Id'] = session.memberId;
  headers['Content-Type'] = 'application/json';
  return headers;
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  let message = '';
  try {
    const payload = (await response.json()) as { message?: string; title?: string };
    message = payload.message || payload.title || '';
  } catch {
    // Use the friendly fallback when the server does not return JSON.
  }
  return new Error(message || `${fallback} (error ${response.status}).`);
}

function mapAttendance(payload: unknown): AttendanceResponse {
  const attendance = (payload ?? {}) as Record<string, unknown>;
  return {
    id: String(attendance.id ?? ''),
    familyEventId: String(attendance.familyEventId ?? ''),
    memberId: String(attendance.memberId ?? ''),
    rsvp: Number(attendance.rsvp ?? 0),
  };
}

export async function getEventAttendance(eventId: string): Promise<AttendanceResponse[]> {
  const response = await fetch(`${API_BASE_URL}/api/eventattendance/event/${eventId}`, {
    headers: await attendanceHeaders(),
  });
  if (!response.ok) throw await responseError(response, 'Unable to load attendee responses');
  const payload: unknown = await response.json();
  return Array.isArray(payload) ? payload.map(mapAttendance) : [];
}

export async function saveEventAttendance(eventId: string, rsvp: number): Promise<AttendanceResponse> {
  const response = await fetch(`${API_BASE_URL}/api/eventattendance`, {
    method: 'POST',
    headers: await attendanceHeaders(),
    body: JSON.stringify({ familyEventId: eventId, rsvp }),
  });
  if (!response.ok) throw await responseError(response, 'Unable to update your response');
  return mapAttendance(await response.json());
}
