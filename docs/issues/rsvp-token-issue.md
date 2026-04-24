# RSVP Token Issue — Summary

## Problem
RSVP functionality on the deployed Vercel dashboard fails with:
```
RSVP failed: invalid_grant
```

This error comes from Google's OAuth2 API when the refresh token stored in `GOOGLE_OAUTH_TOKEN_JSON` has expired or been revoked.

## Root Cause
The Google Cloud project (`392719700381`) has the OAuth consent screen in **Testing** mode. In Testing mode, Google revokes refresh tokens after **7 days** of inactivity. This means the token stored in Vercel needs to be manually refreshed every 7 days.

## Accounts & Projects Involved

| Purpose | Google Account | OAuth Client / Project |
|---------|---------------|------------------------|
| Dashboard sign-in (next-auth) | `<your_email>` | `392719700381-...` |
| Calendar & Gmail API (RSVP) | `<your_email>` | `392719700381-...` |

**Note:** An older OAuth client (`811445586193-...`) exists from a previous setup tied to the same account. It is no longer in use — `.gauth.json` and all Vercel env vars now point to `392719700381`.

## How to Refresh the Token (Manual Fix)

Run this from the project root:

```bash
python3 reauth.py
```

Sign in with `<your_email>` when the browser opens. Then base64-encode the new token:

```bash
base64 -i .credentials/.oauth2.<your_email>.json | tr -d '\n'
```

Copy the output and update `GOOGLE_OAUTH_TOKEN_JSON` in Vercel → Project Settings → Environment Variables. No redeploy needed.

## Permanent Fix (Not Yet Done)
Publish the OAuth consent screen from **Testing** to **Production** in Google Cloud Console (`392719700381` project). This makes refresh tokens long-lived (~6 months or until revoked).

**Blocker:** Google requires app verification for apps requesting sensitive scopes (Calendar, Gmail) before publishing to Production. Verification requires submitting the app for Google review, which can take several days.

## Current Workaround
Manually refresh the token every 7 days using the steps above.

## Related Files
- `.gauth.json` — OAuth client credentials (points to `392719700381`)
- `.credentials/.oauth2.<your_email>.json` — local token file
- `src/agents/calendar-agent.ts` — reads `GAUTH_JSON` + `GOOGLE_OAUTH_TOKEN_JSON` env vars
- `src/agents/email-agent.ts` — same
- `reauth.py` — one-time re-auth script
