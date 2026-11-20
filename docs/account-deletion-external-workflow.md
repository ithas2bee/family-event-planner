# External account deletion workflow

## Public URL

The public deletion page is served by the existing API host at:

`https://api-dev.huddleupmobileapp.com/delete-account`

Use this HTTPS URL in the Google Play Console account deletion field when this host is the selected public deployment. If a separate production API hostname is established, set `ACCOUNT_DELETION_VERIFICATION_URL` to that host's `/delete-account` URL and publish that URL in Play Console instead. Do not enter a development host for a production listing.

The page and API are deployed together in the existing API Docker image; no separate web application or hosting service is required. The API's static page does not require CORS or authentication.

## Request and verification

1. A user enters the email address associated with the account.
2. `POST /api/account-deletion/requests` always returns the same accepted message for registered and unregistered addresses. The endpoint is limited to five requests per minute per source IP, using the existing password-recovery rate-limit policy.
3. If the address matches a password account and there is no unexpired pending token, the API creates a 256-bit random token, stores only its SHA-256 hash, and queues a Resend email. Delivery runs in a bounded in-process background queue, so the public response does not wait on email-provider latency. A pending token prevents repeated requests from sending repeated emails to the same account. Queue, delivery, and token-storage errors do not disclose the address or account status; a queue or delivery failure invalidates the token when possible.
4. The email link opens the public page with the token in the URL fragment. The fragment is removed from browser history and is sent only in the verification POST body, not in the page request or referrer.
5. Account deletion starts only after the user explicitly confirms on the page. The API atomically consumes the token using a concurrency-checked update, then calls the same `AccountDeletionService` used by authenticated `DELETE /api/account`. Invalid, expired, used, and concurrent replayed links cannot start deletion again.
6. Successful deletion is confirmed only after the existing deletion service commits. Last-administrator rejection and processing failures return non-sensitive failure messages; they are not reported as successful deletions.

The token lifetime defaults to 30 minutes and may be configured from 1 to 1440 minutes. Expired token rows are deleted by the existing 15-minute content-expiration processor. Consumed rows are removed when they expire. The token table cascades with user deletion. The outbound email queue is process-local; if the API restarts before an email is delivered, the user can submit a new request after the token expires.

## Configuration and deployment

Required existing email configuration remains:

```text
RESEND_API_KEY=<Resend API key from the secret store>
Email__FromAddress=<sender address verified with Resend>
```

Configure these additional API settings:

```text
ACCOUNT_DELETION_VERIFICATION_URL=https://<public-api-host>/delete-account
ACCOUNT_DELETION_TOKEN_LIFETIME_MINUTES=30
```

The verification URL must be an absolute HTTPS URL with no query or fragment. The request endpoint responds with a generic unavailable message until email delivery and the HTTPS verification URL are configured. Keep provider credentials in the deployment secret store; do not commit them.

Deploy using the existing API Docker Compose workflow. Startup applies the new EF Core migration automatically. After deployment, verify `GET /delete-account` over HTTPS, submit a test request using a controlled account, and confirm the email link succeeds once and cannot be replayed. No production deployment, DNS change, or infrastructure change is included here.

## Data handling

The external flow uses the same deletion service and policy documented in [account-deletion-data-handling.md](account-deletion-data-handling.md). In particular, account-linked private records are deleted, shared community content and associated files are retained, and free-text content is not scanned for personal information. A last-administrator account cannot be deleted until another administrator is assigned. External files, backups, provider logs, and profile images hosted outside the API database are outside the verified deletion boundary.
