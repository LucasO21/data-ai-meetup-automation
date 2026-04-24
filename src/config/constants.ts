export const AIRTABLE_API_KEY   = process.env.AIRTABLE_API_KEY!;
export const AIRTABLE_BASE_ID   = process.env.AIRTABLE_BASE_ID!;
export const AIRTABLE_TABLE     = process.env.AIRTABLE_TABLE_NAME ?? "meetup_events";
export const AIRTABLE_LOGS_TABLE = process.env.AIRTABLE_LOGS_TABLE ?? "Scrape Logs";

export const FIRECRAWL_API_KEY  = process.env.FIRECRAWL_API_KEY!;

export const CRON_SCHEDULE      = process.env.CRON_SCHEDULE ?? "0 8 * * 0"; // Sunday 8AM

export const LOG_PATH           = "./logs/workflow.log";
