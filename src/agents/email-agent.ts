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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function buildEmailRaw(to: string, event: AirtableEvent): string {
  const subject = `RSVP Confirmed: ${event.eventName}`;
  const body = [
    `You're confirmed for: ${event.eventName}`,
    ``,
    `Group:    ${event.groupName}`,
    `Date:     ${formatDate(event.eventDate)}`,
    `Location: ${event.eventLocation}`,
    `Link:     ${event.eventURL}`,
  ].join("\n");

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join("\n");

  return Buffer.from(message).toString("base64url");
}

export async function sendConfirmationEmail(event: AirtableEvent): Promise<void> {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  // Get the authenticated user's email address
  const profile = await gmail.users.getProfile({ userId: "me" });
  const userEmail = profile.data.emailAddress!;

  const raw = buildEmailRaw(userEmail, event);
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  console.log(`[email] Confirmation sent for "${event.eventName}" to ${userEmail}`);
}
