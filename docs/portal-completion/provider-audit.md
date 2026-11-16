# Provider authentication-log check

On 15 November 2026, a read-only check used the existing signed-in Clerk dashboard session and explicitly selected Goldleaf Learning, application `app_3LyzXAocYiLgKVHeJivK74GU6gX`, Production instance `ins_3Lz5EfVJtiUbCU54QjFNl0D6CYw`. Application logs showed `sign_in.created`, `session.created` and `sign_in.completed` for the existing administrator's Google sign-in at 21:57 UTC. The dashboard was available even though the Clerk CLI was unavailable.

The Hobby workspace UI showed a one-day log limit. This describes the visible search window; underlying provider storage or deletion retention was not verified. An event-payload copy control was visible, but no payload was copied. Bulk export, team permissions and coverage for provider failures or recovery events were not verified. No conclusion about complete authentication-event coverage or a need for a custom sink follows from this one sign-in.

The provider also automatically sent a new-device sign-in security notification to the existing administrator mailbox: provider logs show acceptance at 21:57:57 UTC and delivery at 21:57:58 UTC. Earlier statements that no mail occurred during the browser check missed this indirect notification. This was not a requested test send; inbox receipt was not verified. No test invitations, invoice notifications, verification or recovery messages were requested. No accounts or provider settings were changed.

The sanitized observation is recorded externally in `provider-log-check-2026-11-15.json`; it does not include event payloads, IP addresses or provider user or session identifiers. Before pilot release, confirm the relevant event types, team access and revocation, actual retention and bulk lookup/export with an authorised operator.
