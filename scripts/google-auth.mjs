/**
 * One-time Google OAuth setup.
 * Run: node scripts/google-auth.mjs
 * Opens a browser → sign in → saves token to .credentials/
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const GAUTH_FILE = ".gauth.json";
const CREDENTIALS_DIR = ".credentials";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

const gauth = JSON.parse(fs.readFileSync(GAUTH_FILE, "utf8"));
const { client_id, client_secret, redirect_uris } = gauth.installed ?? gauth.web;

const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oauth2.generateAuthUrl({ access_type: "offline", scope: SCOPES });

console.log("\n📋 Open this URL in your browser:\n");
console.log(authUrl);
console.log("\nAfter signing in, paste the code from the redirect URL below.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  const { tokens } = await oauth2.getToken(code.trim());
  oauth2.setCredentials(tokens);

  // Get the email to use as filename (matching mcp-gsuite convention)
  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const email = profile.data.emailAddress;

  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  const tokenPath = path.join(CREDENTIALS_DIR, `.oauth2.${email}.json`);
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

  console.log(`\n✅ Token saved to ${tokenPath}`);
  console.log("You can now run: claude mcp list (gsuite should show ✓)");
});
