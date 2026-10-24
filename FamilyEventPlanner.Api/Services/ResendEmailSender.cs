using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mail;

namespace FamilyEventPlanner.Api.Services;

public sealed class ResendEmailSender : IEmailSender
{
    private const string EmailsEndpoint = "https://api.resend.com/emails";
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ResendEmailSender> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_configuration["RESEND_API_KEY"]) &&
        MailAddress.TryCreate(_configuration["Email:FromAddress"], out _);

    public async Task SendAsync(string recipient, string subject, string body)
    {
        var apiKey = _configuration["RESEND_API_KEY"];
        var fromAddress = _configuration["Email:FromAddress"];
        if (string.IsNullOrWhiteSpace(apiKey) || !MailAddress.TryCreate(fromAddress, out _))
        {
            throw new InvalidOperationException("Email delivery is not configured.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, EmailsEndpoint)
        {
            Content = JsonContent.Create(new
            {
                from = fromAddress,
                to = recipient,
                subject,
                text = body,
                html = BuildHtmlBody(body)
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(
                "Resend email delivery request failed ({FailureType}).",
                exception.GetType().Name);
            throw new InvalidOperationException("Email delivery failed.");
        }

        using (response)
        {
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            _logger.LogWarning(
                "Resend email delivery failed with status code {StatusCode}.",
                (int)response.StatusCode);
            throw new InvalidOperationException("Email delivery failed.");
        }
    }

    private static string BuildHtmlBody(string body)
    {
        var htmlLines = body.Split('\n')
            .Select(line => line.TrimEnd('\r'))
            .Select(line =>
            {
                if (Uri.TryCreate(line, UriKind.Absolute, out _))
                {
                    var encodedUrl = WebUtility.HtmlEncode(line);
                    return $"<a href=\"{encodedUrl}\" style=\"display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;\">Reset Password</a>";
                }

                return WebUtility.HtmlEncode(line);
            });

        return $"<!doctype html><html><body>{string.Join("<br>\n", htmlLines)}</body></html>";
    }
}
