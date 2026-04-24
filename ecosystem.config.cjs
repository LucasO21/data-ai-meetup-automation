// Env vars (AIRTABLE_API_KEY, AIRTABLE_BASE_ID, ANTHROPIC_API_KEY, FIRECRAWL_API_KEY, etc.)
// are loaded from .envrc via direnv — start PM2 from a direnv-blessed shell.
module.exports = {
  apps: [
    {
      name: "meetup-cron",
      script: "node",
      args: "dist/cron/schedule.js",
      cwd: __dirname,
    },
  ],
};
