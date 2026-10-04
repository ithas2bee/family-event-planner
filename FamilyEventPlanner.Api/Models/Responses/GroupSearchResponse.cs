namespace FamilyEventPlanner.Api.Models.Responses
{
    public class GroupSearchResponse
    {
        public Guid groupId { get; set; }
        public string groupName { get; set; }
        public string groupType { get; set; }
        public bool isInviteOnly { get; set; }
        public string accessMode { get; set; }
    }
}
