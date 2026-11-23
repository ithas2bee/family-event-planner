export function requestAccountDeletion(options: {
  apiBaseUrl: string;
  authToken: string | null | undefined;
  password: string;
}): Promise<void>;

export function submitAccountDeletion(options: {
  lock: { current: boolean };
  password: string;
  confirmation: string;
  requestDeletion: (password: string) => Promise<string>;
  clearActiveGroup: () => Promise<void>;
  clearSession: () => Promise<void>;
  clearPreferences: (userId: string) => Promise<void>;
  setProcessing: (processing: boolean) => void;
  onSuccess: (result: { cleanupSucceeded: boolean }) => void | Promise<void>;
}): Promise<boolean>;
