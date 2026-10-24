using System.Net;
using System.Net.Mail;

namespace FamilyEventPlanner.Api.Services;

public sealed class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public SmtpEmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_configuration["Email:SmtpHost"]) &&
        !string.IsNullOrWhiteSpace(_configuration["Email:FromAddress"]);

    public async Task SendAsync(string recipient, string subject, string body)
    {
        var host = _configuration["Email:SmtpHost"];
        var fromAddress = _configuration["Email:FromAddress"];
        if (!IsConfigured || string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromAddress))
        {
            throw new InvalidOperationException("Email delivery is not configured.");
        }

        var port = _configuration.GetValue("Email:SmtpPort", 587);
        var enableSsl = _configuration.GetValue("Email:EnableSsl", true);
        var username = _configuration["Email:SmtpUsername"];
        var password = _configuration["Email:SmtpPassword"];

        using var message = new MailMessage(fromAddress, recipient, subject, body);
        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network
        };

        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        await client.SendMailAsync(message);
    }
}
