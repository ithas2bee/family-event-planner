import Constants from 'expo-constants';

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? Constants.expoConfig?.extra?.apiBaseUrl ?? '';

export const API_BASE_URL = (() => {
  const value = String(configuredBaseUrl).trim().replace(/\/+$/, '');

  if (!value) {
    throw new Error(
      'Missing Expo API base URL. Set EXPO_PUBLIC_API_BASE_URL in FamilyEventPlanner.Mobile/.env to your development PC LAN IP, for example http://10.0.0.50:5249.'
    );
  }

  return value;
})();
