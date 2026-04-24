function extractMeetupEventInfo(scrapedPage) {
  try {
    // Accept either:
    // 1. the full object: { data: "<html>...</html>" }
    // 2. the raw HTML string itself
    const html = typeof scrapedPage === "string" ? scrapedPage : scrapedPage?.data;

    if (!html || typeof html !== "string") {
      throw new Error("Invalid input: expected an HTML string or an object with a `data` field.");
    }

    // Extract the __NEXT_DATA__ JSON block
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );

    if (!nextDataMatch) {
      throw new Error("__NEXT_DATA__ script tag not found.");
    }

    const nextDataJson = nextDataMatch[1];
    const nextData = JSON.parse(nextDataJson);

    const apolloState = nextData?.props?.pageProps?.__APOLLO_STATE__;
    if (!apolloState) {
      throw new Error("__APOLLO_STATE__ not found in __NEXT_DATA__.");
    }

    // Find the group object
    const groupEntry = Object.entries(apolloState).find(
      ([key, value]) => key.startsWith("Group:") && value?.__typename === "Group"
    );

    if (!groupEntry) {
      throw new Error("Group object not found.");
    }

    const group = groupEntry[1];

    // Find the event object
    const eventEntry = Object.entries(apolloState).find(
      ([key, value]) => key.startsWith("Event:") && value?.__typename === "Event"
    );

    if (!eventEntry) {
      throw new Error("Event object not found.");
    }

    const event = eventEntry[1];

    // Resolve venue reference if present
    let venue = null;
    if (event.venue?.__ref) {
      venue = apolloState[event.venue.__ref] || null;
    }

    // Clean description a bit
    const cleanDescription = (event.description || "")
      .replace(/\*\*/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/\\u0026/g, "&")
      .replace(/\\n/g, "\n")
      .trim();

    return {
      meetup_group_name: group.name || null,
      event_name: event.title || null,
      event_description: cleanDescription || null,
      event_date_time_start: event.dateTime || null,
      event_date_time_end: event.endTime || null,
      event_location: venue
        ? {
            venue_name: venue.name || null,
            address: venue.address || null,
            city: venue.city || null,
            state: venue.state || null,
            country: venue.country ? venue.country.toUpperCase() : null,
          }
        : null,
      event_url: event.eventUrl || null,
    };
  } catch (error) {
    return {
      error: true,
      message: error.message,
    };
  }
}