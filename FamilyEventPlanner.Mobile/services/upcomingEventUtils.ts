export function filterUpcomingEvents<T extends { startDate: string }>(events: T[], now = new Date()): T[] {
  const currentTime = now.getTime();

  return events.filter((event) => {
    const eventTime = new Date(event.startDate).getTime();
    return !Number.isNaN(eventTime) && eventTime > currentTime;
  });
}
