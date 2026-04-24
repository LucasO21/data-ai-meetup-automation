import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import type { AirtableEvent } from "./airtable-agent.js";

const ROOT = process.env.PROJECT_ROOT ?? process.cwd();
const CREDENTIALS_DIR = path.join(ROOT, ".credentials");
const GAUTH_FILE = path.join(ROOT, ".gauth.json");

function getOAuth2Client() {
  const gauthJson = process.env.GAUTH_JSON;
  const oauthTokenJson = process.env.GOOGLE_OAUTH_TOKEN_JSON;

  let clientId: string, clientSecret: string, redirectUri: string;
  let token: object;

  if (gauthJson && oauthTokenJson) {
    // Deployed: read credentials from env vars
    const gauth = JSON.parse(Buffer.from(gauthJson, "base64").toString("utf8")) as { installed?: { client_id: string; client_secret: string; redirect_uris: string[] }; web?: { client_id: string; client_secret: string; redirect_uris: string[] } };
    const creds = gauth.installed ?? gauth.web!;
    clientId = creds.client_id;
    clientSecret = creds.client_secret;
    redirectUri = creds.redirect_uris[0]!;
    token = JSON.parse(Buffer.from(oauthTokenJson, "base64").toString("utf8")) as object;
  } else {
    // Local: read credentials from files
    const gauth = JSON.parse(fs.readFileSync(GAUTH_FILE, "utf8")) as { installed?: { client_id: string; client_secret: string; redirect_uris: string[] }; web?: { client_id: string; client_secret: string; redirect_uris: string[] } };
    const creds = gauth.installed ?? gauth.web!;
    clientId = creds.client_id;
    clientSecret = creds.client_secret;
    redirectUri = creds.redirect_uris[0]!;

    const tokenFiles = fs.readdirSync(CREDENTIALS_DIR).filter((f) =>
      f.startsWith(".oauth2.")
    );
    if (tokenFiles.length === 0) {
      throw new Error(
        "No OAuth2 token found. Run: uvx mcp-gsuite auth --gauth-file .gauth.json --accounts-file .accounts.json --credentials-dir .credentials"
      );
    }
    token = JSON.parse(
      fs.readFileSync(path.join(CREDENTIALS_DIR, tokenFiles[0]!), "utf8")
    ) as object;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2.setCredentials(token);
  return oauth2;
}

export async function createCalendarEvent(event: AirtableEvent): Promise<string> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: "v3", auth });

  const startTime = new Date(event.eventDate);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // default 2hr duration

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.eventName,
      location: event.eventLocation,
      description: `${event.groupName}\n\n${event.eventURL}`,
      start: { dateTime: startTime.toISOString(), timeZone: "America/New_York" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/New_York" },
    },
  });

  const calendarEventId = result.data.id!;
  console.log(`[calendar] Created event "${event.eventName}" → ${calendarEventId}`);
  return calendarEventId;
}

export async function deleteCalendarEvent(calendarEventId: string): Promise<void> {
  const auth = getOAuth2Client();
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: calendarEventId });
    console.log(`[calendar] Deleted event ${calendarEventId}`);
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 410 || code === 404) {
      console.log(`[calendar] Event ${calendarEventId} already deleted (${code}) — skipping`);
      return;
    }
    throw err;
  }
}
