/**
 * Cron scheduler — triggers the weekly workflow every Sunday at 8:00 AM ET.
 * Run: npx tsx cron/schedule.ts
 */
import cron from "node-cron";
import { CRON_SCHEDULE } from "../config/constants.js";
import { runWeeklyWorkflow } from "../workflows/weekly-workflow.js";
import * as fs from "fs";
import { LOG_PATH } from "../config/constants.js";

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.mkdirSync("logs", { recursive: true });
  fs.appendFileSync(LOG_PATH, line);
}

log(`[cron] Scheduler started. Schedule: "${CRON_SCHEDULE}"`);

cron.schedule(
  CRON_SCHEDULE,
  async () => {
    log("[cron] Triggering weekly workflow…");
    try {
      await runWeeklyWorkflow();
      log("[cron] Weekly workflow completed successfully");
    } catch (err) {
      log(`[cron] Weekly workflow failed: ${err}`);
    }
  },
  { timezone: "America/New_York" }
);
