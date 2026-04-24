import { NextResponse } from "next/server";
import { runWeeklyWorkflow } from "@backend/workflows/weekly-workflow.js";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runWeeklyWorkflow();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron] Weekly workflow failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
