import https from "https";
import { MEETUP_URLS } from "../config/urls.js";

export interface ScrapedEvent {
  groupName: string;
  eventName: string;
  eventDescription: string;
  eventDate: string;       // ISO 8601
  eventLocation: string;
  eventUrl: string;
}

const GQL_QUERY = (urlname: string) => `{
  groupByUrlname(urlname: "${urlname}") {
    events(first: 10) {
      edges {
        node {
          title
          dateTime
          eventUrl
          description
          venue { name address city state }
        }
      }
    }
  }
}`;

function gqlRequest(query: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const req = https.request(
      {
        hostname: "www.meetup.com",
        path: "/gql2",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "Mozilla/5.0",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function urlnameFromUrl(url: string): string {
  // e.g. https://www.meetup.com/genaidc/events/ -> genaidc
  const match = url.match(/meetup\.com\/([^/]+)\//);
  if (!match) throw new Error(`Cannot extract urlname from ${url}`);
  return match[1]!;
}

async function scrapeGroup(groupName: string, url: string): Promise<ScrapedEvent[]> {
  const urlname = urlnameFromUrl(url);
  const result = await gqlRequest(GQL_QUERY(urlname));

  if (result.errors) {
    throw new Error(`GraphQL error for ${groupName}: ${result.errors[0]?.message}`);
  }

  const edges = result.data?.groupByUrlname?.events?.edges ?? [];
  const now = new Date();

  return edges
    .map((edge: any) => {
      const node = edge.node;
      if (!node.dateTime || new Date(node.dateTime) <= now) return null;

      const v = node.venue;
      const location = v
        ? [v.name, v.address, v.city, v.state].filter(Boolean).join(", ")
        : "Online / TBD";

      const description = ((node.description as string) ?? "")
        .replace(/\*\*/g, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .trim()
        .slice(0, 5000);

      return {
        groupName,
        eventName: node.title ?? "Untitled",
        eventDescription: description,
        eventDate: node.dateTime,
        eventLocation: location,
        eventUrl: node.eventUrl ?? "",
      } satisfies ScrapedEvent;
    })
    .filter(Boolean) as ScrapedEvent[];
}

async function scrapeGroupWithRetry(groupName: string, url: string): Promise<ScrapedEvent[]> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const events = await scrapeGroup(groupName, url);
      console.log(`[scraper] ${groupName}: ${events.length} events found`);
      return events;
    } catch (err) {
      if (attempt === 1) {
        console.warn(`[scraper] ${groupName} attempt 1 failed, retrying in 5s...`);
        await new Promise((r) => setTimeout(r, 5_000));
      } else {
        throw err;
      }
    }
  }
  return [];
}

export async function runScraperAgent(): Promise<ScrapedEvent[]> {
  const allEvents: ScrapedEvent[] = [];

  for (const { groupName, url } of MEETUP_URLS) {
    try {
      const events = await scrapeGroupWithRetry(groupName, url);
      allEvents.push(...events);
    } catch (err) {
      console.error(`[scraper] Skipping ${groupName} after retries:`, err);
    }
  }

  console.log(`[scraper] Total events scraped: ${allEvents.length}`);
  return allEvents;
}
