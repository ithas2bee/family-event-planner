# Registration age eligibility

Huddle Up registration requires users to be at least 14 years old. The backend
policy is configured once in `Registration:MinimumAge` in
`FamilyEventPlanner.Api/appsettings.json`; deployment configuration can override
that setting without duplicating the rule in backend endpoints.
The mobile app retrieves the current eligibility policy from
`GET /api/auth/registration-policy` so its validation and explanatory copy use
the same configured threshold.

The mobile app collects a date of birth in `YYYY-MM-DD` format so eligibility can
be calculated accurately at the birthday boundary. It sends the date only with
the registration request. The API validates the calendar date and age against
its current UTC date, then discards the value; date of birth is not stored on
`User`, included in the response, or written to application logs. No database
migration is needed. The existing optional `User.Age` field is profile data and
is not used as evidence of age eligibility.

Existing accounts are not blocked or prompted to re-verify. Their optional age
data may be missing or self-reported, so it is not treated as proof; eligibility
is enforced for new registrations. The only current public account-creation
endpoint is password registration. The internal Unknown Guest user is a system
identity, not a registrant. Any future third-party registration endpoint must
collect a date of birth and apply the same backend policy before creating a user.
