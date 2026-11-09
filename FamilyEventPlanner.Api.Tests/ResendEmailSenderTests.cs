using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using FamilyEventPlanner.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace FamilyEventPlanner.Api.Tests;

public class ResendEmailSenderTests
{
    [Fact]
    public async Task SendAsyncPostsEmailToResendUsingConfiguredKeyAndSender()
    {
        HttpRequestMessage? sentRequest = null;
        string? sentBody = null;
        var handler = new StubHttpMessageHandler(async (request, cancellationToken) =>
        {
            sentRequest = request;
            sentBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var sender = CreateSender(handler, new Dictionary<string, string?>
        {
            ["RESEND_API_KEY"] = "test-resend-key",
            ["Email:FromAddress"] = "no-reply@send.huddleupmobileapp.com"
        });

        await sender.SendAsync(
            "person@example.com",
            "Reset your Huddle Up password",
            "Use this link within 30 minutes to reset your Huddle Up password:\n\nfamilyeventplannermobile://reset-password?token=reset-token\n\nIf Huddle Up does not open, reset your password in a browser:\n\nhttps://api-dev.huddleupmobileapp.com/reset-password?token=reset-token\n\nIf you did not request a password reset, you can ignore this email.");

        Assert.True(sender.IsConfigured);
        Assert.Equal(HttpMethod.Post, sentRequest!.Method);
        Assert.Equal("https://api.resend.com/emails", sentRequest.RequestUri!.AbsoluteUri);
        Assert.Equal("Bearer", sentRequest.Headers.Authorization!.Scheme);
        Assert.Equal("test-resend-key", sentRequest.Headers.Authorization.Parameter);

        using var payload = JsonDocument.Parse(sentBody!);
        Assert.Equal("no-reply@send.huddleupmobileapp.com", payload.RootElement.GetProperty("from").GetString());
        Assert.Equal("person@example.com", payload.RootElement.GetProperty("to").GetString());
        Assert.Equal("Reset your Huddle Up password", payload.RootElement.GetProperty("subject").GetString());
        var text = payload.RootElement.GetProperty("text").GetString();
        Assert.Contains("within 30 minutes", text);
        Assert.Contains("familyeventplannermobile://reset-password?token=reset-token", text);
        Assert.Contains("https://api-dev.huddleupmobileapp.com/reset-password?token=reset-token", text);

        var html = payload.RootElement.GetProperty("html").GetString();
        Assert.Contains("Reset Password</a>", html);
        var hrefs = Regex.Matches(html!, "<a\\b[^>]*\\bhref=\"([^\"]*)\"")
            .Select(match => WebUtility.HtmlDecode(match.Groups[1].Value))
            .ToArray();
        Assert.Equal(
            ["https://api-dev.huddleupmobileapp.com/reset-password?token=reset-token"],
            hrefs);
        Assert.True(Uri.TryCreate(hrefs.Single(), UriKind.Absolute, out var resetUri));
        Assert.Equal(Uri.UriSchemeHttps, resetUri!.Scheme);
        Assert.DoesNotContain("href=\"familyeventplannermobile:", html);
        Assert.Contains("within 30 minutes", html);
    }

    [Theory]
    [InlineData("familyeventplannermobile://reset-password?token=reset-token")]
    [InlineData("javascript:alert(1)")]
    public async Task SendAsyncDoesNotRenderNonHttpsUrisAsLinks(string uri)
    {
        string? html = null;
        var handler = new StubHttpMessageHandler(async (request, cancellationToken) =>
        {
            using var payload = JsonDocument.Parse(
                await request.Content!.ReadAsStringAsync(cancellationToken));
            html = payload.RootElement.GetProperty("html").GetString();
            return new HttpResponseMessage(HttpStatusCode.OK);
        });
        var sender = CreateSender(handler, new Dictionary<string, string?>
        {
            ["RESEND_API_KEY"] = "test-resend-key",
            ["Email:FromAddress"] = "no-reply@send.huddleupmobileapp.com"
        });

        await sender.SendAsync("person@example.com", "subject", uri);

        Assert.DoesNotContain("<a ", html);
        Assert.Contains(WebUtility.HtmlEncode(uri), html);
    }

    [Fact]
    public async Task SendAsyncThrowsWhenResendRejectsEmail()
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
            {
                Content = new StringContent("provider details")
            }));
        var sender = CreateSender(handler, new Dictionary<string, string?>
        {
            ["RESEND_API_KEY"] = "test-resend-key",
            ["Email:FromAddress"] = "no-reply@send.huddleupmobileapp.com"
        });

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => sender.SendAsync("person@example.com", "subject", "body"));

        Assert.Equal("Email delivery failed.", exception.Message);
    }

    [Theory]
    [InlineData(null, "no-reply@send.huddleupmobileapp.com")]
    [InlineData("test-resend-key", "not-an-email")]
    public async Task IsConfiguredIsFalseAndSendAsyncRejectsInvalidConfiguration(
        string? apiKey,
        string fromAddress)
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        var sender = CreateSender(handler, new Dictionary<string, string?>
        {
            ["RESEND_API_KEY"] = apiKey,
            ["Email:FromAddress"] = fromAddress
        });

        Assert.False(sender.IsConfigured);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => sender.SendAsync("person@example.com", "subject", "body"));
        Assert.Equal(0, handler.RequestCount);
    }

    private static ResendEmailSender CreateSender(
        HttpMessageHandler handler,
        Dictionary<string, string?> settings)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
        return new ResendEmailSender(
            new HttpClient(handler),
            configuration,
            NullLogger<ResendEmailSender>.Instance);
    }

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> sendAsync) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestCount++;
            return sendAsync(request, cancellationToken);
        }
    }
}
