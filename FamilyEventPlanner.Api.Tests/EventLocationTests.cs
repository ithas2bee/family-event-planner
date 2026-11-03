using System.ComponentModel.DataAnnotations;
using FamilyEventPlanner.Api.Models;

namespace FamilyEventPlanner.Api.Tests;

public class EventLocationTests
{
    [Fact]
    public void CreateRequestAcceptsNullableLocationFields()
    {
        var request = new CreateEventRequest
        {
            FamilyGroupId = Guid.NewGuid(),
            Title = "Park picnic",
            StartDate = DateTime.UtcNow,
            LocationName = "Central Park",
            LocationAddress = "New York, NY 10024",
            Latitude = 40.7829,
            Longitude = -73.9654,
            PlaceId = "ChIJ4zGFAZpYwokRGUGph3Mf37k"
        };

        var results = new List<ValidationResult>();
        Assert.True(Validator.TryValidateObject(request, new ValidationContext(request), results, true));
        Assert.Null(new FamilyEvent { LocationName = null, Latitude = null }.LocationName);
    }

    [Theory]
    [InlineData(-91, 0)]
    [InlineData(91, 0)]
    [InlineData(0, -181)]
    [InlineData(0, 181)]
    public void LocationCoordinatesRejectOutOfRangeValues(double latitude, double longitude)
    {
        var request = new CreateEventRequest { Latitude = latitude, Longitude = longitude };
        var results = new List<ValidationResult>();

        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), results, true));
    }
}
