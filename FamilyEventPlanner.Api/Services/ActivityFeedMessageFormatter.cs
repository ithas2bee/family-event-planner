using System.Text.Json;
using FamilyEventPlanner.Api.Models.Responses;

namespace FamilyEventPlanner.Api.Services
{
    public static class ActivityFeedMessageFormatter
    {
        public static string Format(ActivityFeedResponse activity)
        {
            var actorName = string.IsNullOrWhiteSpace(activity.ActorDisplayName)
                ? "Someone"
                : activity.ActorDisplayName;

            var metadata = ParseMetadata(activity.MetadataJson);

            return activity.ActivityType switch
            {
                "KickbackCreated" => FormatKickbackCreated(actorName, metadata),
                "KickbackResponseUpdated" => FormatKickbackResponseUpdated(actorName, metadata),
                "PollCreated" => FormatPollCreated(actorName, metadata),
                "PollVoted" => FormatPollVoted(actorName, metadata),
                "EventCreated" => FormatEventCreated(actorName, metadata),
                "AnnouncementCreated" => FormatAnnouncementCreated(actorName, metadata),
                "MemberJoined" => $"{actorName} joined the group",
                _ => $"{actorName} did {activity.ActivityType}"
            };
        }

        private static string FormatKickbackCreated(string actorName, Dictionary<string, string> metadata)
        {
            var vibe = GetValue(metadata, "vibe");
            return !string.IsNullOrWhiteSpace(vibe)
                ? $"{actorName} started a {vibe} kickback"
                : $"{actorName} started a kickback";
        }

        private static string FormatKickbackResponseUpdated(string actorName, Dictionary<string, string> metadata)
        {
            var vibe = GetValue(metadata, "vibe");
            var responseType = GetValue(metadata, "responseType");

            if (responseType == "PullingUp")
            {
                return !string.IsNullOrWhiteSpace(vibe)
                    ? $"{actorName} is pulling up to {vibe}"
                    : $"{actorName} is pulling up";
            }

            if (responseType == "Maybe")
            {
                return !string.IsNullOrWhiteSpace(vibe)
                    ? $"{actorName} might stop by {vibe}"
                    : $"{actorName} might stop by";
            }

            return !string.IsNullOrWhiteSpace(vibe)
                ? $"{actorName} responded to {vibe}"
                : $"{actorName} updated their kickback response";
        }

        private static string FormatPollCreated(string actorName, Dictionary<string, string> metadata)
        {
            var question = GetValue(metadata, "question");
            return !string.IsNullOrWhiteSpace(question)
                ? $"{actorName} created a poll: {question}"
                : $"{actorName} created a poll";
        }

        private static string FormatPollVoted(string actorName, Dictionary<string, string> metadata)
        {
            var question = GetValue(metadata, "question");
            return !string.IsNullOrWhiteSpace(question)
                ? $"{actorName} voted in {question}"
                : $"{actorName} voted in a poll";
        }

        private static string FormatEventCreated(string actorName, Dictionary<string, string> metadata)
        {
            var title = GetValue(metadata, "title");
            return !string.IsNullOrWhiteSpace(title)
                ? $"{actorName} created event {title}"
                : $"{actorName} created an event";
        }

        private static string FormatAnnouncementCreated(string actorName, Dictionary<string, string> metadata)
        {
            var title = GetValue(metadata, "title");
            return !string.IsNullOrWhiteSpace(title)
                ? $"{actorName} posted an announcement: {title}"
                : $"{actorName} posted an announcement";
        }

        private static Dictionary<string, string> ParseMetadata(string? metadataJson)
        {
            if (string.IsNullOrWhiteSpace(metadataJson))
                return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(metadataJson);
                return parsed ?? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            }
            catch
            {
                return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            }
        }

        private static string? GetValue(Dictionary<string, string> metadata, string key)
        {
            return metadata.TryGetValue(key, out var value) ? value : null;
        }
    }
}
