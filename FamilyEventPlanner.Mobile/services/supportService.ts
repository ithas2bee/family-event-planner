import { loadSession } from '@/services/sessionService';

const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? '';
export const FEEDBACK_MAX_LENGTH = 2000;
export const FEEDBACK_CATEGORIES = ['Bug', 'Suggestion', 'General feedback'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export function createSupportEmailUrl(subject: string, body: string): string {
  return `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function getSupportEmailBody(): Promise<string> {
  const session = await loadSession().catch(() => null);
  const accountDetails = session
    ? `Name: ${session.displayName}\nEmail: ${session.email}`
    : 'Account: Not signed in';
  return `Hello Huddle Up Support,\n\nPlease describe how we can help.\n\n${accountDetails}`;
}

export async function createFeedbackEmailUrl(category: FeedbackCategory, message: string): Promise<string> {
  const session = await loadSession().catch(() => null);
  const accountDetails = session
    ? `Name: ${session.displayName}\nEmail: ${session.email}`
    : 'Account: Not signed in';
  const body = `Category: ${category}\n\n${message}\n\n${accountDetails}`;
  return createSupportEmailUrl(`Huddle Up Feedback: ${category}`, body);
}

export function validateFeedbackMessage(message: string): string | null {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return 'Enter a message before submitting.';
  if (trimmedMessage.length > FEEDBACK_MAX_LENGTH) {
    return `Keep your message to ${FEEDBACK_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}
