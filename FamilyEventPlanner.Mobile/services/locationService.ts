import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

export type EventLocation = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
};

export type LocationSuggestion = { placeId: string; description: string };

async function headers() {
  const value = await getAuthHeaders();
  const session = await loadSession();
  if (session?.memberId) value['X-Member-Id'] = session.memberId;
  return value;
}

export async function searchLocations(input: string, sessionToken: string): Promise<LocationSuggestion[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/locations/autocomplete?input=${encodeURIComponent(input)}&sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: await headers() },
  );
  if (!response.ok) throw new Error('Location search is temporarily unavailable.');
  return (await response.json()) as LocationSuggestion[];
}

export async function getLocationDetails(placeId: string, sessionToken: string): Promise<EventLocation> {
  const response = await fetch(
    `${API_BASE_URL}/api/locations/details/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: await headers() },
  );
  if (!response.ok) throw new Error('That location could not be loaded. Please try another search.');
  const result = (await response.json()) as {
    placeId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  return result;
}
