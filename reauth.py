"""
One-time Google OAuth2 re-authentication script.
Opens a browser, you sign in, and it writes a fresh token to .credentials/.
Delete this file after use.
"""

import json, http.server, urllib.parse, webbrowser, urllib.request, os

GAUTH = json.load(open(".gauth.json"))["web"]
CLIENT_ID = GAUTH["client_id"]
CLIENT_SECRET = GAUTH["client_secret"]
REDIRECT_URI = "http://localhost:4100/code"
SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send"

# Derive account email from .accounts.json or GOOGLE_ACCOUNT_EMAIL env var
email = os.environ.get("GOOGLE_ACCOUNT_EMAIL")
if not email:
    accounts = json.load(open(".accounts.json"))["accounts"]
    email = accounts[0]["email"]
TOKEN_FILE = f".credentials/.oauth2.{email}.json"

auth_url = (
    f"https://accounts.google.com/o/oauth2/auth"
    f"?client_id={CLIENT_ID}"
    f"&redirect_uri={urllib.parse.quote(REDIRECT_URI)}"
    f"&response_type=code"
    f"&scope={urllib.parse.quote(SCOPES)}"
    f"&access_type=offline"
    f"&prompt=consent"
)

code = None

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global code
        qs = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(qs)
        code = params.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h2>Auth complete! You can close this tab.</h2>")

    def log_message(self, *args):
        pass

print(f"\nOpening browser for Google sign-in...\n")
print(f"If the browser doesn't open, visit this URL manually:\n{auth_url}\n")
webbrowser.open(auth_url)

server = http.server.HTTPServer(("localhost", 4100), Handler)
server.handle_request()

if not code:
    print("ERROR: No auth code received")
    exit(1)

# Exchange code for tokens
data = urllib.parse.urlencode({
    "code": code,
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code",
}).encode()

req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
resp = json.loads(urllib.request.urlopen(req).read())

token = {
    "access_token": resp["access_token"],
    "refresh_token": resp["refresh_token"],
    "scope": resp["scope"],
    "token_type": resp["token_type"],
    "expiry_date": int(__import__("time").time() * 1000) + resp["expires_in"] * 1000,
}

with open(TOKEN_FILE, "w") as f:
    json.dump(token, f, indent=2)

print(f"\nToken saved to {TOKEN_FILE}")
print("RSVP should now work. You can delete reauth.py.")
